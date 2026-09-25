"""Browser UI regression tests using an explicitly mocked in-memory Storage adapter.

No network navigation is required: load the portable HTML into a blank page.
This verifies rendering/interactions, NOT real file:// or browser-origin persistence.
For native persistence and installed-device checks, use docs/QA.md.
"""
import json
import os
from pathlib import Path
import shutil
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'artifacts/peibu-prototype.html').read_text(encoding='utf-8')
KEY = 'peibu.prototype.v1'

class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        kwargs = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            kwargs['executable_path'] = executable
        cls.browser = cls.pw.chromium.launch(**kwargs)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1050}, locale='zh-TW', timezone_id='Asia/Taipei')
        self.errors = []
        self.page = self.new_page()

    def tearDown(self):
        self.assertEqual(self.errors, [], 'Unexpected browser errors')
        self.context.close()

    def new_page(self, seed=None, mock=True):
        page = self.context.new_page()
        page.on('pageerror', lambda err: self.errors.append(str(err)))
        seed = seed or {}
        prelude = ''
        if mock:
            prelude = '<script>window.__testStore = new Map(Object.entries(' + json.dumps(seed) + ')); Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>window.__testStore.get(k)??null,setItem:(k,v)=>window.__testStore.set(k,String(v))}});</script>'
        page.set_content(HTML.replace('<div id="app"></div>', '<div id="app"></div>' + prelude), wait_until='load')
        page.locator('.page-heading').wait_for()
        return page

    def state(self, page=None):
        page = page or self.page
        return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)

    def finish_first(self, page=None):
        page = page or self.page
        page.get_by_role('button', name='開始這一小步', exact=True).click()
        page.locator('[name="observation"]').fill('能自己接到下一句')
        page.locator('[name="actualMinutes"]').fill('7')
        page.get_by_role('button', name='記下這一步', exact=True).click()

    def test_01_completion_survives_mode_change(self):
        self.finish_first()
        record = self.state()['records'][0]
        self.page.locator('#mode-compact').click()
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.assertEqual(self.state()['records'][0], record)
        self.page.get_by_role('button', name='套用調整', exact=True).click()
        self.assertEqual(self.state()['records'][0], record)
        self.assertEqual(self.page.locator('.task-row.done').count(), 1)
        expect(self.page.locator('.task-row.done')).to_contain_text('15 分鐘上限')
        self.page.get_by_role('button', name='撤銷上次模式調整').click()
        self.assertEqual(self.state()['records'][0], record)

    def test_02_storage_adapter_roundtrip_reopen(self):
        self.finish_first()
        raw = self.page.evaluate('(key)=>localStorage.getItem(key)', KEY)
        reopened = self.new_page({KEY: raw})
        self.assertEqual(reopened.locator('.task-row.done').count(), 1)
        reopened.locator('#nav-history').click()
        expect(reopened.locator('.record-card')).to_contain_text('能自己接到下一句')

    def test_03_mobile_layout_and_mode_visibility(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.assertLess(self.page.locator('.next-card').bounding_box()['y'], 360)
        self.assertLess(self.page.locator('.mode-panel').bounding_box()['y'], self.page.locator('.timeline').bounding_box()['y'])
        expect(self.page.locator('#m-nav-history')).to_be_visible()
        self.page.locator('#m-nav-history').click()
        expect(self.page.get_by_role('heading', name='回看，不是打分數。')).to_be_visible()

    def test_04_child_view_has_next_step_not_admin_settings(self):
        self.page.locator('#child-mode').click()
        expect(self.page.get_by_role('heading', name='小禾的小步時間')).to_be_visible()
        self.assertEqual(self.page.locator('[data-action="add"]').count(), 0)
        self.assertEqual(self.page.locator('[data-action="edit"]').count(), 0)
        expect(self.page.get_by_role('button', name='看看怎麼做')).to_be_visible()
        self.page.get_by_role('button', name='看看怎麼做').click()
        self.page.locator('[name="outcome"][value="help"]').check()
        self.page.get_by_role('button', name='記下這一步').click()
        self.assertEqual(self.state()['records'][0]['outcome'], 'help')

    def test_05_add_edit_task_and_escape_user_text(self):
        self.page.get_by_role('button', name='新增安排', exact=True).click()
        title = '<img src=x onerror="window.__pwn=1">'
        self.page.locator('[name="title"]').fill(title)
        self.page.locator('[name="start"]').fill('15:00')
        self.page.locator('[name="goal"]').fill('只看這一句，不需要全曲。')
        self.page.get_by_role('button', name='儲存安排').click()
        self.assertIsNone(self.page.evaluate('window.__pwn'))
        self.assertEqual(self.page.locator('img').count(), 0)
        task = next(t for t in self.state()['tasks'] if t['title'] == title)
        expect(self.page.locator(f'[data-task-id="{task["id"]}"]')).to_contain_text(title)
        self.page.locator(f'[data-action="edit"][data-id="{task["id"]}"]').click()
        self.page.locator('[name="title"]').fill('改好的小步驟')
        self.page.get_by_role('button', name='儲存安排').click()
        self.assertEqual(next(t for t in self.state()['tasks'] if t['id'] == task['id'])['title'], '改好的小步驟')

    def test_06_template_creates_clean_new_week(self):
        self.finish_first()
        self.page.locator('#nav-templates').click()
        self.page.get_by_role('button', name='儲存這週模板').first.click()
        self.page.locator('[name="name"]').fill('小步週模板')
        self.page.get_by_role('button', name='儲存模板', exact=True).click()
        self.page.get_by_role('button', name='預覽套用').click()
        self.page.get_by_role('button', name='確認套用').click()
        self.assertEqual(len(self.state()['tasks']), 84)
        self.assertEqual(len(self.state()['records']), 1)
        self.assertEqual(self.page.locator('.task-row.done').count(), 0)

    def test_07_corrupt_storage_is_retained(self):
        page = self.new_page({KEY: '{broken'})
        expect(page.locator('.storage-alert')).to_contain_text('已保留原檔')
        self.finish_first(page)
        self.assertEqual(page.evaluate('(key)=>localStorage.getItem(key)', KEY), '{broken')
        expect(page.locator('.save-badge')).to_contain_text('暫存')

    def test_08_invalid_import_never_overwrites(self):
        before = self.state()
        self.page.locator('#nav-settings').click()
        self.page.locator('#import-file').set_input_files({'name': 'wrong.json', 'mimeType': 'application/json', 'buffer': b'{"schemaVersion":999}'})
        expect(self.page.locator('#toast')).to_contain_text('不是陪步')
        self.assertEqual(self.state(), before)

    def test_09_rest_mode_retains_protected_activities(self):
        self.page.locator('#mode-rest').click()
        self.page.get_by_role('button', name='套用調整').click()
        self.assertEqual(self.page.locator('.task-row.mode-rest').count(), 3)
        self.assertEqual(self.page.locator('.task-row.pending').count(), 3)
        expect(self.page.locator('.next-card')).to_contain_text('國語')

    def test_10_no_storage_origin_shows_warning_and_still_renders(self):
        page = self.new_page(mock=False)
        expect(page.locator('.storage-alert')).to_be_visible()
        expect(page.locator('.next-card')).to_be_visible()
        self.assertEqual(page.locator('.task-row').count(), 6)

    def test_11_valid_import_requires_confirmation(self):
        original = self.state()
        incoming = json.loads(json.dumps(original))
        incoming['profile']['childName'] = '另一個示範'
        self.page.locator('#nav-settings').click()
        self.page.locator('#import-file').set_input_files({'name': 'valid.json', 'mimeType': 'application/json', 'buffer': json.dumps(incoming, ensure_ascii=False).encode()})
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.assertEqual(self.state(), original)
        self.page.get_by_role('button', name='取消', exact=True).click()
        self.assertEqual(self.state(), original)

    def test_12_large_text_settings_and_modal_keyboard(self):
        self.page.locator('#nav-settings').click()
        self.page.locator('[name="fontScale"]').select_option('1.2')
        self.page.locator('[name="childName"]').fill('小樹')
        self.page.get_by_role('button', name='儲存偏好').click()
        self.assertEqual(self.state()['profile']['fontScale'], 1.2)
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.page.locator('#m-nav-today').click()
        self.page.get_by_role('button', name='新增安排', exact=True).click()
        self.page.keyboard.press('Escape')
        expect(self.page.get_by_role('dialog')).not_to_be_visible()

if __name__ == '__main__':
    unittest.main(verbosity=2)

/**
 * Chỉ chạy inject footer và nav (không cần Supabase/API).
 * Dùng khi cần cập nhật header/footer cho tất cả trang HTML.
 * Chạy: node scripts/inject-html-only.js
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function injectFooter() {
  const flagSvg = '<span class="footer-flag" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid meet"><rect width="30" height="20" fill="#DA251D"/><path fill="#FFFF00" d="M15 4l2.47 7.6H25l-6.23 4.5 2.36 7.3L15 16.2l-6.13 4.2 2.36-7.3L5 11.6h7.53z"/></svg></span>';
  const newFooterInner = [
    '<div class="footer-vietnam-wrap"><div class="footer-vietnam-banner">' + flagSvg + ' Trường Sa &amp; Hoàng Sa là của Việt Nam!</div></div>',
    '<div class="footer-bottom">',
    '  <div class="footer-bottom-inner">',
    '    <a href="/" class="footer-logo">GoTV</a>',
    '    <span class="footer-divider" aria-hidden="true"></span>',
    '    <div class="footer-links-col">',
    '      <a href="/hoi-dap.html">Hỏi - đáp</a>',
    '      <a href="/chinh-sach-bao-mat.html">Chính sách bảo mật</a>',
    '      <a href="/dieu-khoan-su-dung.html">Điều khoản sử dụng</a>',
    '    </div>',
    '  </div>',
    '</div>',
    '<p class="footer-copyright">Copyright 2018 <a href="https://gotv.top" target="_blank" rel="noopener">GoTV</a>. All rights reserved.</p>',
  ].join('\n    ');
  let count = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        if (!content.includes('footer-vietnam-banner')) {
          content = content.replace(/Trường Sa,\s*Hoàng Sa/gi, 'Trường Sa & Hoàng Sa');
          content = content.replace(
            /<footer[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/i,
            '<footer class="site-footer">\n    ' + newFooterInner + '\n  </footer>'
          );
          fs.writeFileSync(full, content, 'utf8');
          count++;
        }
      }
    }
  }
  walk(PUBLIC);
  console.log('Footer: updated', count, 'files');
}

function injectNav() {
  let count = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        if (content.includes('huong-dan-app')) continue;
        const prefix = content.includes('href="../') ? 'href="../' : 'href="/';
        const taiApp = '<a ' + prefix + 'huong-dan-app.html">Tải app</a>';
        const lienHe = '<a ' + prefix + 'lien-he.html">Liên hệ</a>';
        const added = taiApp + lienHe;
        if (content.includes('donate')) {
          content = content.replace(/(<a [^>]*donate[^"']*"[^>]*>Donate<\/a>)/i, '$1' + added);
        } else if (content.includes('gioi-thieu')) {
          content = content.replace(/(<a [^>]*gioi-thieu[^"']*"[^>]*>Giới thiệu<\/a>)/i, '$1' + added);
        }
        if (content.includes('huong-dan-app')) {
          fs.writeFileSync(full, content, 'utf8');
          count++;
        }
      }
    }
  }
  walk(PUBLIC);
  console.log('Nav: updated', count, 'files');
}

function injectLoadingScreen() {
  const html = '<div id="loading-screen" class="loading-screen" aria-hidden="false"><div class="loading-screen-inner"><div class="loading-screen-logo">GoTV</div><p class="loading-screen-text">Loading...</p></div></div>';
  let count = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        if (content.includes('id="loading-screen"')) continue;
        content = content.replace(/<body(\s[^>]*)?>/i, '<body$1>\n  ' + html);
        fs.writeFileSync(full, content, 'utf8');
        count++;
      }
    }
  }
  walk(PUBLIC);
  console.log('Loading screen: updated', count, 'files');
}

injectFooter();
injectNav();
injectLoadingScreen();
console.log('Done.');

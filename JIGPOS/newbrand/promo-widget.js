/* Origin promo voucher widget (shared).
 * One source of truth for "create a promo discount for THIS product" used by both
 * promos.html and stock-sheet.html. Exposes window.OriginPromo.open(product).
 * product = { _id, name, price }. Uses the page's own login token. Server is authoritative
 * on the discount; this only builds the voucher via POST /vouchers.
 */
(function () {
  if (window.OriginPromo) return;

  function apiBase() {
    var h = window.location.host;
    if (h.indexOf('localhost') >= 0 || h.indexOf('127.0.0.1') >= 0) return window.location.protocol + '//' + h + '/api/v1';
    return window.location.protocol + '//' + h + '/pos/api/v1';
  }
  function token() { return sessionStorage.getItem('adminToken') || localStorage.getItem('token') || ''; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function promoLink(slug) { return window.location.protocol + '//' + window.location.host + '/promo.html?v=' + slug; }

  var API = apiBase();
  var el = null; // modal root

  function injectStyles() {
    if (document.getElementById('op-styles')) return;
    var s = document.createElement('style');
    s.id = 'op-styles';
    s.textContent =
      '.op-ov{position:fixed;inset:0;background:rgba(10,9,8,.72);display:none;align-items:center;justify-content:center;z-index:99999;padding:16px;}' +
      '.op-ov.on{display:flex;}' +
      '.op-card{width:100%;max-width:460px;max-height:92vh;overflow:auto;background:#fff;border-radius:16px;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#1c1b18;}' +
      '.op-hd{background:#0e0d0b;color:#f4efe4;padding:16px 18px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;}' +
      '.op-hd .t{font:700 15px/1.2 Georgia,serif;letter-spacing:.5px;}.op-hd .t .g{color:#C9A84C;}' +
      '.op-hd .x{background:none;border:0;color:#9c9484;font-size:22px;cursor:pointer;line-height:1;}' +
      '.op-bd{padding:18px;}' +
      '.op-prod{background:#faf8f2;border:1px solid #e7e2d6;border-radius:10px;padding:11px 13px;margin-bottom:12px;}' +
      '.op-prod .n{font-weight:700;font-size:14px;}.op-prod .p{color:#6f6a5f;font-size:12px;margin-top:2px;}' +
      '.op-lbl{display:block;font:600 11px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#6f6a5f;margin:12px 0 5px;}' +
      '.op-in{width:100%;padding:11px 12px;border:1px solid #d8d2c4;border-radius:9px;font-size:14px;box-sizing:border-box;background:#fff;}' +
      '.op-row{display:flex;gap:10px;}.op-row>div{flex:1;}' +
      '.op-btn{width:100%;margin-top:16px;background:#C9A84C;color:#241d08;border:0;border-radius:10px;padding:13px;font:700 14px/1 system-ui;cursor:pointer;}' +
      '.op-btn:active{transform:translateY(1px);}' +
      '.op-msg{font-size:13px;margin-top:10px;min-height:18px;}' +
      '.op-gen{display:none;margin-top:14px;border-top:1px solid #e7e2d6;padding-top:14px;}' +
      '.op-vc{background:#171613;color:#f4efe4;border-radius:14px;padding:14px;text-align:center;background-image:radial-gradient(130% 90% at 0% 0%, rgba(201,168,76,.2), transparent 52%);}' +
      '.op-vc .amt{font-family:Georgia,serif;font-weight:700;color:#D4B86A;font-size:40px;line-height:1;margin:2px 0;}' +
      '.op-vc .amt small{font-size:15px;color:#9c9484;}' +
      '.op-vc .on{font-size:13px;color:#e9e2d0;}' +
      '.op-vc .qr{width:150px;height:150px;background:#fff;border-radius:10px;padding:6px;margin:10px auto 6px;display:block;}' +
      '.op-vc .code{font:700 17px/1 "Courier New",monospace;letter-spacing:2px;color:#fff;}' +
      '.op-lnk{display:flex;gap:8px;margin-top:12px;}.op-lnk input{flex:1;font-size:12px;}' +
      '.op-ghost{background:#fff;border:1px solid #d8d2c4;border-radius:9px;padding:0 14px;font-weight:700;cursor:pointer;}' +
      '.op-share{display:flex;gap:8px;margin-top:10px;}' +
      '.op-wa{flex:1;text-align:center;background:#25D366;color:#04310f;text-decoration:none;font:700 13px/1 system-ui;padding:12px;border-radius:9px;}' +
      '.op-open{flex:1;text-align:center;background:#0e0d0b;color:#fff;text-decoration:none;font:700 13px/1 system-ui;padding:12px;border-radius:9px;}';
    document.head.appendChild(s);
  }

  function build() {
    injectStyles();
    el = document.createElement('div');
    el.className = 'op-ov';
    el.innerHTML =
      '<div class="op-card">' +
        '<div class="op-hd"><div class="t">ORIGIN <span class="g">&middot;</span> Promo voucher</div><button class="x" type="button">&times;</button></div>' +
        '<div class="op-bd">' +
          '<div class="op-prod"><div class="n" id="op-pn"></div><div class="p" id="op-pp"></div></div>' +
          '<div class="op-row">' +
            '<div><label class="op-lbl">Discount type</label>' +
              '<select class="op-in" id="op-type"><option value="percentage">Percentage (%)</option><option value="fixed">Amount (R)</option></select></div>' +
            '<div><label class="op-lbl" id="op-vlbl">Discount %</label><input class="op-in" id="op-val" type="number" min="0" step="1" placeholder="15"></div>' +
          '</div>' +
          '<div class="op-row">' +
            '<div><label class="op-lbl">Min spend (optional)</label><input class="op-in" id="op-min" type="number" min="0" step="1" placeholder="0"></div>' +
            '<div><label class="op-lbl">Uses</label><select class="op-in" id="op-lim">' +
              '<option value="single_use">Once in total</option><option value="once_per_customer">Once per customer</option>' +
              '<option value="limited">A set number</option><option value="unlimited">Unlimited</option></select></div>' +
          '</div>' +
          '<div class="op-row">' +
            '<div id="op-maxwrap" style="display:none;"><label class="op-lbl">Number of uses</label><input class="op-in" id="op-max" type="number" min="1" step="1" placeholder="50"></div>' +
            '<div><label class="op-lbl">Expires on</label><input class="op-in" id="op-exp" type="date"></div>' +
          '</div>' +
          '<button class="op-btn" type="button" id="op-gen">Generate voucher</button>' +
          '<div class="op-msg" id="op-msg"></div>' +
          '<div class="op-gen" id="op-result">' +
            '<div class="op-vc"><div class="amt" id="op-amt"></div><div class="on" id="op-on"></div><img class="qr" id="op-qr" alt="QR"><div class="code" id="op-code"></div></div>' +
            '<label class="op-lbl">Shareable promo link</label>' +
            '<div class="op-lnk"><input class="op-in" id="op-link" readonly><button class="op-ghost" type="button" id="op-copy">Copy</button></div>' +
            '<div class="op-share"><a class="op-wa" id="op-wa" target="_blank">Share on WhatsApp</a><a class="op-open" id="op-openlink" target="_blank">Open link</a></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    var $ = function (id) { return el.querySelector('#' + id); };
    el.querySelector('.x').onclick = close;
    el.onclick = function (e) { if (e.target === el) close(); };
    $('op-type').onchange = function () { $('op-vlbl').textContent = this.value === 'fixed' ? 'Discount amount (R)' : 'Discount %'; };
    $('op-lim').onchange = function () { $('op-maxwrap').style.display = this.value === 'limited' ? 'block' : 'none'; };
    $('op-gen').onclick = generate;
    $('op-copy').onclick = function () { var i = $('op-link'); i.select(); try { document.execCommand('copy'); } catch (e) {} };
  }

  var current = null; // the product

  function open(product) {
    if (!el) build();
    current = product || {};
    var $ = function (id) { return el.querySelector('#' + id); };
    $('op-pn').textContent = current.name || 'Product';
    $('op-pp').textContent = (current.price != null) ? ('R' + current.price) : '';
    $('op-type').value = 'percentage'; $('op-vlbl').textContent = 'Discount %';
    $('op-val').value = ''; $('op-min').value = ''; $('op-lim').value = 'single_use';
    $('op-maxwrap').style.display = 'none'; $('op-max').value = '';
    $('op-exp').value = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    $('op-msg').textContent = ''; $('op-result').style.display = 'none';
    el.classList.add('on');
    $('op-val').focus();
  }
  function close() { if (el) el.classList.remove('on'); }

  async function generate() {
    var $ = function (id) { return el.querySelector('#' + id); };
    var msg = $('op-msg');
    var type = $('op-type').value, value = parseFloat($('op-val').value);
    var expiry = $('op-exp').value, limSel = $('op-lim').value;
    if (isNaN(value) || value <= 0) { msg.style.color = '#DC2626'; msg.textContent = 'Enter a discount value'; return; }
    if (!expiry) { msg.style.color = '#DC2626'; msg.textContent = 'Choose an expiry date'; return; }
    if (!current._id) { msg.style.color = '#DC2626'; msg.textContent = 'No product selected'; return; }
    msg.style.color = '#888'; msg.textContent = 'Generating...';

    var body = {
      name: (type === 'fixed' ? ('R' + value) : (value + '%')) + ' off ' + (current.name || 'product'),
      description: (type === 'fixed' ? ('R' + value) : (value + '%')) + ' off ' + (current.name || 'product'),
      type: type, value: value,
      minPurchase: parseFloat($('op-min').value) || 0,
      expiryDate: expiry,
      redemptionLimit: (limSel === 'limited' || limSel === 'unlimited') ? 'unlimited' : limSel,
      applicableProducts: [current._id],
      channel: 'both'
    };
    if (limSel === 'single_use') body.maxRedemptions = 1;
    else if (limSel === 'limited') body.maxRedemptions = parseInt($('op-max').value) || 1;

    try {
      var r = await fetch(API + '/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() }, body: JSON.stringify(body) });
      var d = await r.json();
      if (!d.success) { msg.style.color = '#DC2626'; msg.textContent = d.error || 'Could not create voucher'; return; }
      msg.style.color = '#137a52'; msg.textContent = 'Voucher created.';
      var v = d.voucher;
      $('op-amt').innerHTML = (type === 'fixed' ? ('R' + value) : (value + '%')) + ' <small>OFF</small>';
      $('op-on').textContent = 'on ' + (current.name || 'product');
      $('op-code').textContent = v.code;
      var link = promoLink(v.publicSlug);
      $('op-link').value = link; $('op-openlink').href = link;
      var shareText = (type === 'fixed' ? ('R' + value) : (value + '%')) + ' OFF on ' + (current.name || 'product') + ' at Origin Potchefstroom. Show code ' + v.code + ' at the till. ' + link;
      $('op-wa').href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
      try { var pr = await fetch(API + '/vouchers/public/' + v.publicSlug); var pd = await pr.json(); if (pd.success && pd.voucher.qrDataUrl) $('op-qr').src = pd.voucher.qrDataUrl; } catch (e) {}
      $('op-result').style.display = 'block';
      if (typeof window.onPromoCreated === 'function') { try { window.onPromoCreated(v); } catch (e) {} }
    } catch (e) { msg.style.color = '#DC2626'; msg.textContent = 'Create failed, try again'; }
  }

  window.OriginPromo = { open: open, close: close };
})();

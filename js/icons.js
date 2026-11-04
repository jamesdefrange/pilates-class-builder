/* Simple drawn line icons. Usage: PCB.icon('lock') returns an SVG string. */
(function () {
  var P = {
    logo: '<circle cx="12" cy="5" r="2.2"/><path d="M4 20h16M7 20c1-4 2.5-6 5-7.5 2.5 1.5 4 3.5 5 7.5M12 12.5V8M8.5 10.5L12 8l3.5 2.5"/>',
    reformer: '<rect x="2" y="13" width="20" height="3" rx="1"/><rect x="7" y="10" width="7" height="3" rx="1"/><path d="M4 16v3M20 16v3M19 13V8M17 8h4M3 10v3"/>',
    box: '<rect x="2" y="15" width="20" height="3" rx="1"/><rect x="5" y="10" width="12" height="5" rx="1"/><path d="M4 18v2M20 18v2"/>',
    chair: '<rect x="6" y="5" width="12" height="7" rx="1.5"/><path d="M7 12v8M17 12v8M5 17h14"/>',
    mat: '<path d="M3 15l9-4 9 4-9 4z"/><path d="M3 15v1.5l9 4 9-4V15"/>',
    bosu: '<path d="M4 16a8 7 0 0 1 16 0z"/><path d="M3 16h18v2H3z"/>',
    springboard: '<rect x="4" y="2" width="16" height="20" rx="1.5"/><circle cx="8" cy="6" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/><path d="M8 7v3l1 1-2 1 2 1-1 1"/>',
    props: '<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>',
    circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.6"/><circle cx="12" cy="20" r="1.6"/>',
    standing: '<circle cx="12" cy="4" r="2"/><path d="M12 7v7M8 10h8M12 14l-3 7M12 14l3 7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    pdf: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    save: '<path d="M5 3h11l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    spring: '<path d="M4 12h2l1.5-4 3 8 3-8 3 8 1.5-4h2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-5l-2 2M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M19 19v2H6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-8 8"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    person: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c.5-4 3.3-6.5 7-6.5s6.5 2.5 7 6.5"/>'
  };
  window.PCB = window.PCB || {};
  window.PCB.icon = function (name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.info) + '</svg>';
  };
})();

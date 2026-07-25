'use strict';
'require baseclass';
'require fs-fit as fit';

/* Footstrap-owned Overview enhancement. It stays OUT of LuCI's global status/include directory,
 * so switching to another theme stops loading it automatically. The logic is the old layout-only
 * overview helper, but loaded from the theme's own resource chain. */

const OVERVIEW_PAGE = 'admin-status-overview';
const ROLES = { [_('System')]: 'sys', [_('Memory')]: 'mem', [_('Storage')]: 'sto' };

let _wrapEl = null;
let _observer = null;
let _observedView = null;
let _routeObserver = null;

function isOverviewPage() {
	return (document.body && document.body.getAttribute('data-page')) === OVERVIEW_PAGE;
}

function sectionTitle(sec) {
	const h = sec.querySelector('.cbi-title h3, :scope > h3');
	return (h && h.firstChild) ? String(h.firstChild.nodeValue || '').trim() : '';
}

function arrange() {
	if (!isOverviewPage()) {
		stopWatch();
		return;
	}

	const view = document.getElementById('view');
	if (!view)
		return;

	if (_wrapEl && _wrapEl.isConnected && _wrapEl.parentElement === view && _wrapEl.children.length === 3)
		return;

	const found = {};
	view.querySelectorAll(':scope > .cbi-section').forEach((sec) => {
		const r = ROLES[sectionTitle(sec)];
		if (r && !found[r])
			found[r] = sec;
	});

	if (!(found.sys && found.mem && found.sto))
		return;

	if (found.sys.parentElement && found.sys.parentElement.classList.contains('fs-ovl')) {
		_wrapEl = found.sys.parentElement;
		return;
	}

	const wrap = document.createElement('div');
	wrap.className = 'fs-ovl';
	found.sys.parentNode.insertBefore(wrap, found.sys);
	found.sys.classList.add('fs-ovl-sys');
	wrap.appendChild(found.sys);
	found.mem.classList.add('fs-ovl-mem');
	wrap.appendChild(found.mem);
	found.sto.classList.add('fs-ovl-sto');
	wrap.appendChild(found.sto);
	_wrapEl = wrap;
}

function stopWatch() {
	if (_observer)
		_observer.disconnect();
	_observer = null;
	_observedView = null;
	_wrapEl = null;
}

function watchOverview() {
	const view = document.getElementById('view');

	if (_observer && _observedView !== view)
		stopWatch();

	arrange();

	if (_observer || !view || !isOverviewPage())
		return;

	_observedView = view;
	_observer = new MutationObserver(fit.frame(arrange));
	_observer.observe(view, { childList: true, subtree: true });
}

function wireRouteObserver() {
	if (_routeObserver || !document.body)
		return;

	_routeObserver = new MutationObserver(() => {
		if (isOverviewPage())
			watchOverview();
		else
			stopWatch();
	});
	_routeObserver.observe(document.body, { attributes: true, attributeFilter: [ 'data-page' ] });
}

return baseclass.extend({
	wire() {
		wireRouteObserver();
		if (document.readyState === 'loading')
			document.addEventListener('DOMContentLoaded', watchOverview, { once: true });
		else
			watchOverview();
	}
});

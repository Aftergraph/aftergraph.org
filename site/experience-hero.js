(function bootstrapExperienceHero(globalScope) {
  function buildAtlasHref(entity, lens) {
    var params = new URLSearchParams();
    params.set('node', entity);
    params.set('view', 'topology');
    params.set('lens', String(lens || 'SYSTEM').toUpperCase());
    return '/atlas/?' + params.toString();
  }

  function initHero(root) {
    if (!root || !root.querySelectorAll) return false;
    var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-atlas-entity]'));
    var inspect = root.querySelector('[data-atlas-inspect]');
    var status = root.querySelector('[data-atlas-selection]');
    if (!nodes.length || !inspect) return false;

    function select(node) {
      nodes.forEach(function (candidate) {
        var active = candidate === node;
        candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
        candidate.classList.toggle('active', active);
      });
      var entity = node.getAttribute('data-atlas-entity');
      var label = node.getAttribute('data-atlas-label') || node.textContent.trim();
      inspect.setAttribute('href', buildAtlasHref(entity, 'SYSTEM'));
      inspect.removeAttribute('aria-disabled');
      inspect.textContent = 'Inspect ' + label + ' in Atlas →';
      if (status) status.textContent = label + ' selected. Open Atlas to inspect source, relations and evidence.';
    }

    nodes.forEach(function (node) {
      node.addEventListener('click', function () { select(node); });
      node.addEventListener('focus', function () { select(node); });
    });
    select(nodes[0]);
    return true;
  }

  var api = { buildAtlasHref: buildAtlasHref, initHero: initHero };
  if (globalScope) globalScope.AftergraphExperienceHero = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initHero(document.querySelector('[data-experience-hero]')); });
    } else {
      initHero(document.querySelector('[data-experience-hero]'));
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : null);

document.addEventListener('DOMContentLoaded', () => {
  // Constants
  const DATA_URL = 'products.json';
  let products = [];

  // DOM Elements
  const productGrid = document.getElementById('product-grid');
  const productCount = document.getElementById('product-count');
  const clearBtn = document.getElementById('clear-filters');
  const filtersAside = document.querySelector('aside.filters');
  const inline = document.getElementById('products-data');
  const m2Input = document.getElementById('m2Input');
  const modal = document.getElementById('product-modal');
  const modalTitle = modal?.querySelector('#modal-title');
  const modalMeta = modal?.querySelector('.modal-meta');
  const modalDesc = modal?.querySelector('.modal-desc');
  const modalPrice = modal?.querySelector('.modal-price');
  const modalMedia = modal?.querySelector('.modal-media');
  const modalSpecs = modal?.querySelector('.modal-specs');

  // Create floor slider elements
  const floorSlider = document.createElement('input');
  floorSlider.type = 'range';
  floorSlider.min = '1';
  floorSlider.max = '8';
  floorSlider.value = '1';
  floorSlider.className = 'floor-slider';

  const floorValue = document.createElement('span');
  floorValue.className = 'floor-value';
  floorValue.textContent = '1 etage';

  // Sorteringsfunktion
  function sortProducts(products, sortBy) {
    if (!sortBy) return products;

    const [field, direction] = sortBy.split('-');
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...products].sort((a, b) => {
      let aValue, bValue;

      if (field === 'pris') {
        aValue = parseFloat(a.pris?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        bValue = parseFloat(b.pris?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
      } else if (field === 'vaegt') {
        aValue = parseFloat(a.data?.['Vægt (kg/m2)']?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        bValue = parseFloat(b.data?.['Vægt (kg/m2)']?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
      } else {
        aValue = parseFloat(a.data?.[field]?.replace(',', '.')) || 0;
        bValue = parseFloat(b.data?.[field]?.replace(',', '.')) || 0;
      }

      return (aValue - bValue) * multiplier;
    });
  }

  // Initialize filters
  function initializeFilters() {
    // Setup etage filter med slider
    const etageFilters = document.getElementById('etage-filters');
    if (etageFilters) {
      // Fjern eksisterende radio button
      const oldLabel = etageFilters.querySelector('label');
      if (oldLabel) oldLabel.remove();

      // Tilføj slider efter summary
      const summary = etageFilters.querySelector('.filter-summary');
      if (summary) {
        // Container til slider og værdi
        const container = document.createElement('div');
        container.className = 'slider-container';
        
        floorSlider.min = '1';
        floorSlider.max = '8';
        floorSlider.value = '1';
        floorSlider.className = 'floor-slider';
        
        floorValue.className = 'floor-value';
        floorValue.textContent = '1 etage';
        
        container.appendChild(floorSlider);
        container.appendChild(floorValue);
        summary.insertAdjacentElement('afterend', container);
      }

      floorSlider.addEventListener('input', () => {
        floorValue.textContent = `${floorSlider.value} ${floorSlider.value === '1' ? 'etage' : 'etager'}`;
        updateProducts();
      });
    }

    // Setup radio button event listeners
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', updateProducts);
    });

    // Hold disse sektioner åbne som standard og forhindre lukning
    const sectionsToOpen = ['anvendelse-filters', 'etage-filters', 'm2-filters'];
    sectionsToOpen.forEach(id => {
      const section = document.getElementById(id);
      if (section) {
        section.setAttribute('open', '');
        section.open = true;
        // Fjern standard details/summary adfærd
        const summary = section.querySelector('summary');
        if (summary) {
          summary.style.pointerEvents = 'none';
          summary.style.cursor = 'default';
        }
        // Forhindre at details elementet kan lukkes
        section.addEventListener('click', (e) => {
          if (e.target.tagName.toLowerCase() === 'summary') {
            e.preventDefault();
            section.setAttribute('open', '');
            section.open = true;
          }
        }, true);
        // Forhindre at keyboard events kan lukke details
        section.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
          }
        }, true);
      }
    });

    // Setup sortering
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        updateProducts();
      });
    }

    // Setup m2 input
    if (m2Input) {
      m2Input.value = ''; // Reset værdi
      m2Input.addEventListener('input', () => {
        updateProducts();
      });
      // Også opdater ved blur for at fange manuelle indtastninger
      m2Input.addEventListener('blur', () => {
        updateProducts();
      });
    }

    // Setup modal listeners
    if (modal) {
      modal.addEventListener('click', (e) => {
        const close = e.target.closest('[data-close]');
        if (close) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }
  }

  // Update products based on filters
  function updateProducts() {
    const activeFilters = getActiveFilters();
    console.log('Active filters:', activeFilters);
    const filtered = products.filter(product => matchesFilters(product, activeFilters));
    
    // Sorter produkter hvis der er valgt en sortering
    const sortSelect = document.getElementById('sort-select');
    const sortedProducts = sortSelect && sortSelect.value 
      ? sortProducts(filtered, sortSelect.value)
      : filtered;
    
    console.log('Filtered and sorted products:', sortedProducts);
    render(sortedProducts);
  }

  // Get active filters
  function getActiveFilters() {
    const map = {};
    if (!filtersAside) return map;

    const blocks = Array.from(filtersAside.querySelectorAll('[id$="-filters"]'));
    blocks.forEach(block => {
      const id = block.id || '';
      const key = id.replace(/-filters$/, '') || null;
      
      if (key === 'etage') {
        map[key] = floorSlider.value;
        return;
      }
      
      if (key === 'm2') {
        // Vi ignorerer m2-input da vi ikke bruger det til filtrering
        return;
      }
      
      const checked = block.querySelector('input:checked');
      if (!key || !checked) return;
      const v = String(checked.value || '').trim();
      if (v && v !== 'all') map[key] = v;
    });
    return map;
  }

  // Error message display function
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `⚠️ ${message}`;
    
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(el => el.remove());
    
    // Insert error message after the filters
    if (filtersAside) {
      filtersAside.appendChild(errorDiv);
    }
  }

  // Check if product matches filters and get any warnings
  function getProductWarnings(product, active, isModal = false) {
    const warnings = [];
    const m2Value = parseInt(m2Input?.value || '0');
    
    // Tjek kun for D1-s2-d2 advarsler når vi er over 600m2 OG har etagebolig valgt
    if (active.anvendelse === 'etagebolig' && m2Value >= 600 && product.specs.brandmodstand === 'D1-s2-d2') {
      if (isModal) {
        warnings.push('OBS: Dette produkt har brandmodstand D1-s2-d2. Ved brug i etagebolig over 600m² skal der tages særlige forholdsregler. Kontakt teknisk afdeling for yderligere information.');
      } else {
        warnings.push('OBS: Kræver særlig opmærksomhed ved brug i etagebolig over 600m²');
      }
    }

    return warnings;
  }

  function matchesFilters(product, active) {
    if (!active || Object.keys(active).length === 0) {
      return false; // Vis ingen produkter indtil anvendelse er valgt
    }
    
    const specs = product.specs || {};
    console.log('Checking product:', product.name);
    console.log('Against filters:', active);

    // Hvis anvendelse er tom, vis intet
    if (!active.anvendelse || active.anvendelse === '') {
      return false;
    }

    // Tjek om produktet har den valgte anvendelse
    if (active.anvendelse && !product.anvendelse.includes(active.anvendelse)) {
      console.log(`Anvendelse mismatch: product has ${product.anvendelse}, filter wants ${active.anvendelse}`);
      return false;
    }
    
    // Regel 1: Etagebolig skal være minimum brandklasse 2
    if (active.anvendelse === 'etagebolig' && active.brandklasse === 'BK1') {
      showError('Etagebolig skal være minimum brandklasse 2');
      return false;
    }

    // Regel 2: Højde og brandmodstand restriktioner for BK2
    if (active.brandklasse === 'BK2' && active.brandmodstand === 'D1-s2-d2') {
      const height = active.hojdeOversteEtage;
      if (height && height.startsWith('under-')) {
        const meters = parseFloat(height.replace('under-', '').replace(',', '.'));
        if (meters > 12) {
          showError('Ved højde over 12 meter i brandklasse 2 må brandmodstand ikke være D1, s2-d2');
          return false;
        }
      }
    }

    // Regel 3: m2 og brandmodstand restriktioner
    if (active.m2Warning && active.m2Warning > 600) {
      if (specs.brandmodstand === 'D1-s2-d2' || product.warnIfUsedForLargeSections) {
        showError('Ved brandsektioner over 600 m² skal du vælge et A2, s1-d0 etagedæk');
        return false;
      }
    }

    // Tjek etager
    if (active.etage) {
      const etageValue = parseInt(active.etage);
      if (isNaN(etageValue) || 
          etageValue < (specs.minEtager || 1) || 
          etageValue > (specs.maxEtager || 8)) {
        console.log(`Etage mismatch: product supports ${specs.minEtager}-${specs.maxEtager}, filter wants ${active.etage}`);
        return false;
      }
    }

    // Handle remaining filters
    for (const [key, value] of Object.entries(active)) {
      // Skip special filters that have their own handling
      if (key === 'etage' || key === 'm2' || key === 'anvendelse') continue;

      // Map filter keys to spec keys
      const specKey = key === 'luftlyd' ? 'luftlydKlasseC' :
                     key === 'trinlyd' ? 'trinlydKlasseC' :
                     key;
                     
      let currentSpecValue;
      
      // Special handling for brandklasse based on anvendelse
      if (key === 'brandklasse') {
        currentSpecValue = product.brandklasser?.[active.anvendelse] || '';
      } else {
        currentSpecValue = specs[specKey];
      }
      
      console.log(`Checking ${key} (${specKey}): product has "${currentSpecValue}", filter wants "${value}"`);
      
      if (currentSpecValue === undefined) {
        console.log(`Spec ${specKey} not found in product`);
        continue; // Skip if spec doesn't exist
      }
      
      // Special handling for brandkrav (minimum requirement)
      if (key === 'brandkrav') {
        const pNum = parseInt(String(currentSpecValue).replace(/[^0-9]/g, ''), 10);
        const sNum = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(pNum) && !isNaN(sNum) && pNum < sNum) {
          console.log(`Brandkrav mismatch: product requires ${currentSpecValue}, filter wants ${value}`);
          return false;
        }
        continue;
      }
      
      // Default string comparison, men tjek kun hvis værdien findes
      if (value && String(currentSpecValue).toLowerCase() !== String(value).toLowerCase()) {
        console.log(`Mismatch for ${key}: product has "${currentSpecValue}", filter wants "${value}"`);
        return false;
      }
    }

    console.log('Product matches all filters');
    return true;
  }

  // Modal functions
  function openModal(product) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Fjern eventuelle eksisterende advarsler
    const existingWarnings = modal.querySelectorAll('.modal-warnings');
    existingWarnings.forEach(warning => warning.remove());

    if (modalTitle) modalTitle.textContent = product.name || '';
    if (modalDesc) modalDesc.textContent = product.description || '';
    if (modalPrice) modalPrice.textContent = product.pris || '';

    if (modalMedia) {
      modalMedia.innerHTML = '';
      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.name || '';
        img.onerror = () => {
          img.remove();
          modalMedia.innerHTML = '<div class="placeholder">📷</div>';
        };
        modalMedia.appendChild(img);
      } else {
        modalMedia.innerHTML = '<div class="placeholder">📷</div>';
      }
    }

    // Vis advarsler hvis nødvendigt under billedet
    if (modalMedia) {
      const warnings = getProductWarnings(product, getActiveFilters(), true); // true for modal warnings
      if (warnings.length > 0) {
        const warningsDiv = document.createElement('div');
        warningsDiv.className = 'modal-warnings';
        warnings.forEach(warning => {
          const warningDiv = document.createElement('div');
          warningDiv.className = 'warning-message';
          warningDiv.textContent = warning;
          warningsDiv.appendChild(warningDiv);
        });
        modalMedia.appendChild(warningsDiv);
      }
    }

    if (modalSpecs) {
      modalSpecs.innerHTML = '';
      
      const specs = product.specs || {};
      const activeFilters = getActiveFilters();
      
      // Vis alle specs fra produktet (undtagen brandklasse som håndteres særskilt)
      Object.entries(specs).forEach(([key, value]) => {
        const row = document.createElement('div');
        row.className = 'spec-row';
        const label = key
          .replace(/([A-Z])/g, ' $1') // Tilføj mellemrum før store bogstaver
          .toLowerCase()
          .replace(/^./, str => str.toUpperCase()); // Gør første bogstav stort
        row.innerHTML = `<span class="spec-label">${label}:</span> ${value}`;
        modalSpecs.appendChild(row);
      });

      // Tilføj brandklasse baseret på anvendelse
      if (activeFilters.anvendelse && product.brandklasser) {
        const brandklasse = product.brandklasser[activeFilters.anvendelse];
        const row = document.createElement('div');
        row.className = 'spec-row';
        row.innerHTML = `<span class="spec-label">Brandklasse:</span> ${brandklasse}`;
        modalSpecs.appendChild(row);
      }

      // Tilføj features hvis de findes
      if (product.features && product.features.length) {
        const title = document.createElement('div');
        title.className = 'spec-row spec-title';
        title.innerHTML = '<span class="spec-label">Features:</span>';
        modalSpecs.appendChild(title);
        const ul = document.createElement('ul');
        ul.className = 'spec-list';
        product.features.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        modalSpecs.appendChild(ul);
      }
    }

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    if (modal.classList.contains('closing')) return;

    modal.classList.add('closing');
    
    const finishClose = () => {
      modal.classList.remove('closing');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      modal.removeEventListener('animationend', onAnimEnd);
    };

    const onAnimEnd = () => finishClose();
    modal.addEventListener('animationend', onAnimEnd);

    // Backup timeout hvis animation ikke trigger
    setTimeout(() => {
      if (modal.classList.contains('closing')) finishClose();
    }, 400);
  }

  // Render products
  function render(filteredProducts) {
    if (!productGrid || !productCount) return;

    productCount.textContent = `${filteredProducts.length} produkt${filteredProducts.length !== 1 ? 'er' : ''}`;
    
    if (filteredProducts.length === 0) {
      productGrid.innerHTML = '<p class="empty">Ingen produkter matcher filtrene.</p>';
      return;
    }

    productGrid.innerHTML = '';
    filteredProducts.forEach((product, index) => {
      const card = document.createElement('article');
      card.className = 'card';
      // Get any warnings for the product
      const warnings = getProductWarnings(product, getActiveFilters());
      const warningsHtml = warnings.length > 0 
        ? `<div class="card-warnings">${warnings.map(w => `<div class="warning-message">${w}</div>`).join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="card-media">
          ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<div class="placeholder">📷</div>'}
        </div>
        <div class="card-body">
          <h3 class="card-title">${product.name || ''}</h3>
          ${warningsHtml}
          <p class="desc">${product.description || ''}</p>
          <div class="price">${product.pris || ''}</div>
        </div>
      `;
      
      // Gør kortet klikbart
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${product.name}. Åbn detaljer`);
      card.addEventListener('click', () => openModal(product));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(product);
        }
      });
      
      card.style.animationDelay = `${index * 60}ms`;
      productGrid.appendChild(card);
    });
  }

  // Load data function
  function loadData() {
    return fetch(DATA_URL)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(() => {
        if (inline?.textContent) {
          try {
            return JSON.parse(inline.textContent);
          } catch (e) {
            console.error('Kunne ikke parse inline products-data', e);
            return null;
          }
        }
        return null;
      });
  }

  // Normalize data
  function normalize(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.products)) return data.products;
    for (const k of Object.keys(data)) {
      if (Array.isArray(data[k])) return data[k];
    }
    return [];
  }

  // Initialize everything
  initializeFilters();
  
  // Load and render initial data
  loadData()
    .then(data => {
      console.log('Loaded data:', data);
      products = normalize(data);
      console.log('Normalized products:', products);
      render(products);
    })
    .catch(error => {
      console.error('Fejl ved indlæsning af produkter:', error);
      if (productGrid) {
        productGrid.innerHTML = '<p class="empty">Kunne ikke indlæse produkter.</p>';
      }
    });

  // Setup clear filters button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const checks = filtersAside?.querySelectorAll('input');
      if (checks) {
        checks.forEach(input => {
          if (input.type === 'radio') input.checked = (input.value === 'all');
        });
      }
      if (m2Input) m2Input.value = '';
      if (floorSlider) {
        floorSlider.value = '1';
        floorValue.textContent = '1 etage';
      }
      render(products);
    });
  }
});
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
        const activeFilters = getActiveFilters();
        // Restrict enfamiliehus to max 3 floors
        if (activeFilters.anvendelse === 'enfamiliehus' && parseInt(floorSlider.value) > 3) {
          floorSlider.value = '3';
        }
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
    
    // If no usage type selected, show empty state and don't load products
    if (!activeFilters.anvendelse) {
      productCount.textContent = '0 produkter';
      productGrid.innerHTML = '<p class="empty">Vælg venligst en anvendelsestype for at se produkter.</p>';
      return;
    }
    
    // Adjust floor slider max based on usage type
    if (activeFilters.anvendelse === 'enfamiliehus') {
      floorSlider.max = '3';
      if (parseInt(floorSlider.value) > 3) {
        floorSlider.value = '3';
        floorValue.textContent = '3 etager';
      }
    } else {
      floorSlider.max = '8';
    }
    
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
    
    // Vis advarsel for alle D1-s2-d2 produkter når sektionen er over 600m²
    if (m2Value >= 600 && product.specs.brandmodstand === 'D1-s2-d2') {
      if (isModal) {
        warnings.push('OBS: Dette produkt har brandmodstand D1-s2-d2. Ved brug i sektioner over 600m² skal der tages særlige forholdsregler. Kontakt teknisk afdeling for yderligere information.');
      } else {
        warnings.push('OBS: Kræver særlig opmærksomhed ved brug i sektioner over 600m²');
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
        // Få den korrekte brandklasse for den valgte anvendelse
        const allowedBrandklasse = product.brandklasser?.[active.anvendelse];
        currentSpecValue = allowedBrandklasse;

        // Hvis der er valgt en specifik brandklasse (ikke 'all'), og den ikke matcher den tilladte, returner false
        if (value !== 'all' && value !== allowedBrandklasse) {
          return false;
        }
        // Skip videre behandling af brandklasse
        continue;
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
      
      // Default comparison, check for arrays and strings
      if (value && value !== 'all') {
        if (Array.isArray(currentSpecValue)) {
          // For arrays, check if the selected value exists in the array
          if (!currentSpecValue.some(v => String(v).toLowerCase() === String(value).toLowerCase())) {
            console.log(`Mismatch for ${key}: product has "${currentSpecValue}", filter wants "${value}"`);
            return false;
          }
        } else if (key === 'brandmodstand') {
          // Special handling for brandmodstand where A2-s1-d0 also satisfies D1-s2-d2 requirement
          if (value === 'D1-s2-d2') {
            // If filter is D1-s2-d2, both D1-s2-d2 and A2-s1-d0 are acceptable
            if (currentSpecValue !== 'D1-s2-d2' && currentSpecValue !== 'A2-s1-d0') {
              console.log(`Brandmodstand mismatch: product has "${currentSpecValue}", filter wants "${value}"`);
              return false;
            }
          } else if (value === 'A2-s1-d0' && currentSpecValue !== 'A2-s1-d0') {
            // If filter is A2-s1-d0, only A2-s1-d0 is acceptable
            console.log(`Brandmodstand mismatch: product has "${currentSpecValue}", filter wants "${value}"`);
            return false;
          }
        } else if (String(currentSpecValue).toLowerCase() !== String(value).toLowerCase()) {
          console.log(`Mismatch for ${key}: product has "${currentSpecValue}", filter wants "${value}"`);
          return false;
        }
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
  // Show shortDescription in modal header
  if (modalDesc) modalDesc.textContent = product.shortDescription || product.description || '';
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

        // CC badge: show first spaendvidde value (e.g. CC300mm -> CC300)
        const ccVal = Array.isArray(product.specs?.spaendvidde) ? product.specs.spaendvidde[0] : product.specs?.spaendvidde;
        if (ccVal) {
          const ccText = String(ccVal).replace(/mm$/i, '');
          const ccBadge = document.createElement('div');
          ccBadge.className = 'badge';
          ccBadge.textContent = ccText;
          // make sure badge appears on top of media area
          modalMedia.appendChild(ccBadge);
        }
      } else {
        modalMedia.innerHTML = '<div class="placeholder">📷</div>';
      }
    }

    // Vis advarsler i info-kolonnen (bedre brug af plads end under billedet)
    // Place warnings in the modal meta area (compact) and prepare a scrollable inner spec container
    const warnings = getProductWarnings(product, getActiveFilters(), true);
    if (modalMeta) {
      modalMeta.innerHTML = '';
      if (warnings.length) {
        const warningsDiv = document.createElement('div');
        warningsDiv.className = 'modal-warnings';
        warnings.forEach(warning => {
          const warningDiv = document.createElement('div');
          warningDiv.className = 'warning-message';
          warningDiv.textContent = warning;
          warningsDiv.appendChild(warningDiv);
        });
        modalMeta.appendChild(warningsDiv);
      }
    }

    if (modalSpecs) {
      // wrap specs into an inner scrollable container so the right column can scroll independently
      modalSpecs.innerHTML = '<div class="modal-specs-inner"></div>';
    }

    if (modalSpecs) {
      // Rebuild modal specs into clearer sections: primary grid, data, features, and collapsible details
      modalSpecs.innerHTML = '';

      const specs = product.specs || {};
      const activeFilters = getActiveFilters();

      const formatLabel = (raw) => {
        if (typeof raw !== 'string') return raw;
        if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) return raw;
        const withSpaces = raw.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
        return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
      };

      const specValue = (k) => {
        let v = specs[k];
        if (v === undefined) return null;
        if (Array.isArray(v)) return v.join(' / ');
        if (k === 'brandsektion') {
          const vv = String(v).toLowerCase();
          if (vv === 'over') return 'Over 600m²';
          if (vv === 'under') return 'Under 600m²';
        }
        return v;
      };

      const keyOrder = ['brandkrav','brandmodstand','brandsektion','hojdeOversteEtage','spaendvidde','minEtager','maxEtager','Max længde','samletTykkelse','Vægt (kg/m2)'];

      // Primary specs grid
      let html = '<div class="spec-section spec-primary">';
      html += '<h3 class="spec-section-title">Nøglespecifikationer</h3>';
      html += '<div class="spec-grid">';
      for (const k of keyOrder) {
        const val = specValue(k);
        if (val !== null && val !== undefined && String(val) !== '') {
          const label = formatLabel(k);
          html += `<div class="spec-row"><div class="spec-label">${label}</div><div class="spec-value">${val}</div></div>`;
        }
      }

      // Brandklasse based on anvendelse
      if (activeFilters.anvendelse && product.brandklasser) {
        const brandklasse = product.brandklasser[activeFilters.anvendelse];
        if (brandklasse) {
          html += `<div class="spec-row"><div class="spec-label">Brandklasse</div><div class="spec-value">${brandklasse}</div></div>`;
        }
      }

      html += '</div></div>';

      // Long description in a collapsible section
      if (product.longDescription) {
        html += '<details class="spec-toggle"><summary>Produktbeskrivelse</summary><div class="spec-section spec-desc"><p>' + product.longDescription + '</p></div></details>';
      }

      // Data section (collapsed by default)
      if (product.data && Object.keys(product.data).length) {
        html += '<details class="spec-toggle"><summary>Data</summary><div class="spec-section spec-data">';
        html += '<div class="spec-grid">';
        Object.entries(product.data).forEach(([k, v]) => {
          const label = formatLabel(k);
          html += `<div class="spec-row"><div class="spec-label">${label}</div><div class="spec-value">${v}</div></div>`;
        });
        html += '</div></div></details>';
      }

      // Features (collapsed by default)
      if (product.features && product.features.length) {
        html += '<details class="spec-toggle"><summary>Features</summary><div class="spec-section spec-features">';
        html += '<ul class="spec-list">';
        product.features.forEach(item => {
          html += `<li>${item}</li>`;
        });
        html += '</ul></div></details>';
      }

      // Other specs in a collapsible details
      const otherKeys = Object.keys(specs).filter(k => !keyOrder.includes(k));
      if (otherKeys.length) {
        html += '<details class="spec-more"><summary>Flere detaljer</summary><div class="spec-grid">';
        otherKeys.forEach(k => {
          const v = specValue(k);
          if (v !== null && v !== undefined && String(v) !== '') {
            const label = formatLabel(k);
            html += `<div class="spec-row"><div class="spec-label">${label}</div><div class="spec-value">${v}</div></div>`;
          }
        });
        html += '</div></details>';
      }

      const inner = modalSpecs.querySelector('.modal-specs-inner');
      if (inner) inner.innerHTML = html;
      else modalSpecs.innerHTML = html;
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
          ${(() => {
            const ccVal = Array.isArray(product.specs?.spaendvidde) ? product.specs.spaendvidde[0] : product.specs?.spaendvidde;
            if (ccVal) {
              const ccText = String(ccVal).replace(/mm$/i, '');
              return `<div class="badge">${ccText}</div>`;
            }
            return '';
          })()}
        </div>
        <div class="card-body">
          <h3 class="card-title">${product.name || ''}</h3>
          ${warningsHtml}
          <p class="desc">${product.shortDescription || product.description || ''}</p>
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
  
  // Load product data but don't render until usage type is selected
  loadData()
    .then(data => {
      console.log('Loaded data:', data);
      products = normalize(data);
      console.log('Normalized products:', products);
      // Show empty state instead of rendering all products
      productCount.textContent = '0 produkter';
      productGrid.innerHTML = '<p class="empty">Vælg venligst en anvendelsestype for at se produkter.</p>';
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
        floorSlider.max = '8';
        floorValue.textContent = '1 etage';
      }
      // Show empty state after clearing
      productCount.textContent = '0 produkter';
      productGrid.innerHTML = '<p class="empty">Vælg venligst en anvendelsestype for at se produkter.</p>';
    });
  }
});
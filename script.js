document.addEventListener('DOMContentLoaded', () => {
	const DATA_URL = 'products.json';

	let products = [];
	let selectedCategories = new Set();
	let selectedWeight = 'all'; // 'all' | 'under' | 'over'

	const categoryContainer = document.getElementById('category-filters');
	const weightContainer = document.getElementById('weight-filters');
	const productGrid = document.getElementById('product-grid');
	const productCount = document.getElementById('product-count');
	const clearBtn = document.getElementById('clear-filters');


	// Behavior:
	// - If served via http(s): fetch products.json (preferred). If fetch fails, try inline fallback.
	// - If opened via file://: parse inline JSON (required), otherwise show helpful error.

	const inline = document.getElementById('products-data');

	if (location.protocol === 'file:') {
		if (inline && inline.textContent && inline.textContent.trim().length > 0) {
			try {
				const inlineData = JSON.parse(inline.textContent);
				products = inlineData;
				buildCategoryFilters(products);
				attachWeightListeners();
				render();
			} catch (e) {
				console.error('Kunne ikke parse inline products-data', e);
				productGrid.innerHTML = '<p class="error">Kunne ikke læse den indbyggede produktdata i HTML. Se console for detaljer.</p>';
			}
		} else {
			productGrid.innerHTML = '<p class="error">Ingen indbygget produktdata fundet — siden skal serviceres via en lokal webserver (http) eller du skal indlejre JSON i HTML.</p>';
			console.error('Åbnet via file:// uden indlejret product-data. Indlej JSON i HTML eller kør en lokal webserver.');
		}
		return;
	}

	fetch(DATA_URL)
		.then(r => {
			if (!r.ok) throw new Error('HTTP ' + r.status);
			return r.json();
		})
		.then(data => {
			products = data;
			buildCategoryFilters(products);
			attachWeightListeners();
			render();
		})
		.catch(err => {
			console.warn('Fetch fejlede — prøver fallback til indlejret JSON i HTML hvis tilgængelig', err);
			if (inline && inline.textContent && inline.textContent.trim().length > 0) {
				try {
					const inlineData = JSON.parse(inline.textContent);
					products = inlineData;
					buildCategoryFilters(products);
					attachWeightListeners();
					render();
					return;
				} catch (e) {
					console.error('Kunne ikke parse inline products-data under fallback', e);
				}
			}
			productGrid.innerHTML = '<p class="error">Fejl ved hentning af products.json (se console). Sørg for at filen findes og at serveren kører.</p>';
			console.error('Fejl ved hentning af products.json', err);
		});

	function buildCategoryFilters(items) {
		const allCats = new Set();
		items.forEach(p => (p.madeFor || []).forEach(tag => allCats.add(tag)));

		const list = document.createElement('div');
		list.className = 'category-list';

		Array.from(allCats).sort().forEach(cat => {
			const id = `cat-${cat.replace(/\s+/g, '-')}`;
			const label = document.createElement('label');
			label.innerHTML = `<input type="checkbox" data-cat="${cat}" id="${id}"> ${cat}`;
			list.appendChild(label);
		});

		categoryContainer.querySelector('.category-list')?.remove();
		categoryContainer.appendChild(list);

		list.addEventListener('change', (e) => {
			const cb = e.target.closest('input[type="checkbox"]');
			if (!cb) return;
			const cat = cb.dataset.cat;
			if (cb.checked) selectedCategories.add(cat); else selectedCategories.delete(cat);
			render();
		});
	}

	function attachWeightListeners() {
		weightContainer.addEventListener('change', (e) => {
			const input = e.target.closest('input[name="weight"]');
			if (!input) return;
			selectedWeight = input.value;
			render();
		});

		clearBtn.addEventListener('click', () => {
			selectedCategories.clear();
			selectedWeight = 'all';
			categoryContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
			weightContainer.querySelectorAll('input[name="weight"]').forEach(rb => rb.checked = rb.value === 'all');
			render();
		});
	}

	function render() {
		const filtered = products.filter(p => {
			if (selectedCategories.size > 0) {
				const has = (p.madeFor || []).some(tag => selectedCategories.has(tag));
				if (!has) return false;
			}

			if (selectedWeight === 'under' && !(p.weightGr < 1000)) return false;
			if (selectedWeight === 'over' && !(p.weightGr >= 1000)) return false;

			return true;
		});

		productCount.textContent = `${filtered.length} produkt${filtered.length !== 1 ? 'er' : ''}`;

		productGrid.innerHTML = '';
		if (filtered.length === 0) {
			productGrid.innerHTML = '<p class="empty">Ingen produkter matcher filtrene.</p>';
			return;
		}

		filtered.forEach(p => {
			const card = document.createElement('article');
			card.className = 'card';

			// animate entry with stagger
			card.classList.add('pop');

			const media = document.createElement('div');
			media.className = 'card-media';
			media.setAttribute('aria-hidden', 'true');

			const placeholder = document.createElement('div');
			placeholder.className = 'placeholder';
			placeholder.textContent = '📷';

			if (p.image) {
				const img = document.createElement('img');
				img.src = p.image;
				img.alt = p.name || '';
				img.onload = () => {
					placeholder.style.display = 'none';
				};
				img.onerror = () => {
					img.remove();
					placeholder.style.display = '';
				};
				media.appendChild(img);
			}

			media.appendChild(placeholder);

			const body = document.createElement('div');
			body.className = 'card-body';

			const title = document.createElement('h3');
			title.className = 'card-title';
			title.innerHTML = escapeHtml(p.name);

			const badges = document.createElement('div');
			badges.className = 'badges';
			(p.madeFor || []).forEach(tag => {
				const b = document.createElement('span');
				b.className = 'badge';
				b.textContent = tag;
				badges.appendChild(b);
			});

			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = (p.madeFor || []).join(', ') + ' • ' + p.weightGr + ' g';

			const desc = document.createElement('p');
			desc.className = 'desc';
			desc.innerHTML = escapeHtml(p.description || '');

			const price = document.createElement('div');
			price.className = 'price';
			price.textContent = formatPrice(p.price);

			body.appendChild(title);
			if ((p.madeFor || []).length) body.appendChild(badges);
			body.appendChild(meta);
			body.appendChild(desc);
			body.appendChild(price);

			card.appendChild(media);
			card.appendChild(body);

					card.tabIndex = 0;
					card.setAttribute('role', 'button');
					card.setAttribute('aria-label', `${p.name}. Åbn detaljer`);
					card.addEventListener('click', () => openModal(p));
					card.addEventListener('keydown', (e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openModal(p);
						}
					});

					card.style.animationDelay = `${filtered.indexOf(p) * 60}ms`;
					productGrid.appendChild(card);
		});
	}


		const modal = document.getElementById('product-modal');
		const modalTitle = modal && modal.querySelector('#modal-title');
		const modalMeta = modal && modal.querySelector('.modal-meta');
		const modalDesc = modal && modal.querySelector('.modal-desc');
		const modalPrice = modal && modal.querySelector('.modal-price');
		const modalMedia = modal && modal.querySelector('.modal-media');
		const modalRaw = modal && modal.querySelector('.modal-raw');

		function openModal(product) {
			if (!modal) return;
			modal.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';

			modalTitle.innerHTML = escapeHtml(product.name || '');
			modalMeta.textContent = (product.madeFor || []).join(', ') + (product.weightGr ? ' • ' + (product.weightGr + ' g') : '');
			modalDesc.innerHTML = escapeHtml(product.description || '');
			modalPrice.textContent = formatPrice(product.price);

			const specs = [];
			if (product.fullName) specs.push({label: 'Fulde navn', value: product.fullName});

			if (product.focalLength) specs.push({label: 'Brændvidde', value: product.focalLength});
			if (product.maxAperture) specs.push({label: 'Max. blænde', value: product.maxAperture});
			if (product.mount) specs.push({label: 'Mount', value: product.mount});
			if (product.imageStabilization) specs.push({label: 'Billedstabilisering', value: product.imageStabilization});
			if (product.focusMotor) specs.push({label: 'Fokusmotor', value: product.focusMotor});
			if (product.minFocusDistanceM) specs.push({label: 'Minimum fokusafstand', value: product.minFocusDistanceM + ' m'});
			if (product.filterSizeMm) specs.push({label: 'Filterstørrelse', value: product.filterSizeMm + ' mm'});
			if (product.dimensions) specs.push({label: 'Dimensioner', value: product.dimensions});

			if (product.profileHeightMm) specs.push({label: 'Højde på profil', value: product.profileHeightMm + ' mm'});
			if (product.totalHeightMm) specs.push({label: 'Samlet højde', value: product.totalHeightMm + ' mm'});
			if (product.fireClass) specs.push({label: 'Brandklasse', value: product.fireClass});
			if (product.soundClass) specs.push({label: 'Lydklasse i dB', value: product.soundClass});
			if (product.weightKgPerM2) specs.push({label: 'Vægt', value: product.weightKgPerM2 + ' kg/m²'});

			const modalSpecs = modal.querySelector('.modal-specs');
			if (modalSpecs) {
				modalSpecs.innerHTML = '';
				if (specs.length) {
					specs.forEach(s => {
						const row = document.createElement('div');
						row.className = 'spec-row';
						row.innerHTML = `<span class="spec-label">${escapeHtml(s.label)}:</span> ${escapeHtml(s.value)}`;
						modalSpecs.appendChild(row);
					});
				}

				if (product.features && product.features.length) {
					const title = document.createElement('div');
					title.className = 'spec-row spec-title';
					title.innerHTML = '<span class="spec-label">Funktioner:</span>';
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

				if (product.components && product.components.length) {
					const title = document.createElement('div');
					title.className = 'spec-row spec-title';
					title.innerHTML = '<span class="spec-label">Komponenter:</span>';
					modalSpecs.appendChild(title);
					const ul2 = document.createElement('ul');
					ul2.className = 'spec-list';
					product.components.forEach(comp => {
						const li = document.createElement('li');
						li.textContent = comp;
						ul2.appendChild(li);
					});
					modalSpecs.appendChild(ul2);
				}
			}

			modalMedia.innerHTML = '';
			if (product.image) {
				const img = document.createElement('img');
				img.src = product.image;
				img.alt = product.name || '';
				img.onerror = () => { img.remove(); modalMedia.innerHTML = '<div class="placeholder">📷</div>'; };
				modalMedia.appendChild(img);
			} else {
				modalMedia.innerHTML = '<div class="placeholder">📷</div>';
			}

			modalRaw.textContent = JSON.stringify(product, null, 2);

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
				modal.removeEventListener('animationend', onAnim);
			};

			let onAnim = (e) => {
				finishClose();
			};

			modal.addEventListener('animationend', onAnim);

			setTimeout(() => {
				if (modal.classList.contains('closing')) finishClose();
			}, 400);
		}

		if (modal) {
			modal.addEventListener('click', (e) => {
				const close = e.target.closest('[data-close]');
				if (close) closeModal();
			});
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') closeModal();
			});
		}

            // Price formatting
	function formatPrice(p) {
		if (!p && p !== 0) return '';
		return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(p / 1);
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

});


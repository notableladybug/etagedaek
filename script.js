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
			body.appendChild(meta);
			body.appendChild(desc);
			body.appendChild(price);

			card.appendChild(media);
			card.appendChild(body);

			productGrid.appendChild(card);
		});
	}

	function formatPrice(p) {
		if (!p && p !== 0) return '';
		return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(p / 100);
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


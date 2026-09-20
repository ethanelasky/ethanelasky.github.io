(() => {
  const shelf = document.querySelector('#bookshelf');
  if (!shelf) return;

  const widget = shelf.querySelector('#gr_custom_widget_1788931927');
  const layouts = [...shelf.querySelectorAll('[data-grid-size]')];
  const previous = shelf.querySelector('[data-page="previous"]');
  const next = shelf.querySelector('[data-page="next"]');
  let size = new URL(location.href).searchParams.get('grid') === '7' ? 7 : 5;
  let page = 0;
  const compactLayout = matchMedia('(max-width: 700px)');
  const tapPreview = matchMedia('(hover: none), (max-width: 700px)');
  const dialog = document.querySelector('#book-review-dialog');

  function bookDetails(cover) {
    const book = cover.closest('.gr_custom_each_container_1788931927');
    const title = cover.querySelector('img')?.alt || 'Book review';
    return {
      title,
      englishTitle: englishTitles[title] || '',
      review: book.querySelector('.gr_custom_review_1788931927')?.textContent.trim() || 'No review yet',
    };
  }

  // English edition titles for the foreign-language titles on this shelf.
  const englishTitles = {
    '房思琪的初戀樂園': 'Fang Si-Chi’s First Love Paradise',
    '阿Q正传': 'The True Story of Ah Q',
    '孔乙己': 'Kong Yiji',
  };

  const preview = document.createElement('div');
  preview.id = 'book-review-preview';
  preview.className = 'book-review-preview';
  preview.setAttribute('role', 'tooltip');
  preview.hidden = true;
  const previewTitle = document.createElement('strong');
  const previewEnglishTitle = document.createElement('span');
  previewEnglishTitle.className = 'book-review-english-title';
  previewEnglishTitle.lang = 'en';
  const previewText = document.createElement('p');
  preview.append(previewTitle, previewEnglishTitle, previewText);
  document.body.append(preview);
  let activeCover;
  let closeTimer;

  function hidePreview() {
    clearTimeout(closeTimer);
    preview.hidden = true;
    activeCover?.removeAttribute('aria-describedby');
    activeCover = null;
  }

  function showPreview(cover) {
    clearTimeout(closeTimer);
    activeCover?.removeAttribute('aria-describedby');
    activeCover = cover;
    const details = bookDetails(cover);
    previewTitle.textContent = details.title;
    previewEnglishTitle.textContent = details.englishTitle;
    previewEnglishTitle.hidden = !previewEnglishTitle.textContent;
    previewText.textContent = details.review;
    cover.removeAttribute('title');
    cover.setAttribute('aria-describedby', preview.id);
    preview.hidden = false;
    const rect = cover.getBoundingClientRect();
    const width = preview.offsetWidth;
    const height = preview.offsetHeight;
    preview.style.left = `${Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 12))}px`;
    preview.style.top = `${Math.max(12, rect.bottom + height + 20 <= innerHeight ? rect.bottom + 8 : rect.top - height - 8)}px`;
  }

  function coverFor(target) {
    return target.closest('.gr_custom_book_container_1788931927 a');
  }

  shelf.addEventListener('click', event => {
    const cover = coverFor(event.target);
    if (!cover || !tapPreview.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    hidePreview();
    const details = bookDetails(cover);
    dialog.querySelector('h2').textContent = details.title;
    const englishTitle = dialog.querySelector('.book-review-english-title');
    englishTitle.textContent = details.englishTitle;
    englishTitle.hidden = !details.englishTitle;
    dialog.querySelector('.book-dialog-review').textContent = details.review;
    dialog.querySelector('.book-dialog-link').href = cover.href;
    dialog.showModal();
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });

  shelf.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || tapPreview.matches) return;
    const cover = coverFor(event.target);
    if (cover && !cover.contains(event.relatedTarget)) showPreview(cover);
  });
  shelf.addEventListener('pointerout', event => {
    const cover = coverFor(event.target);
    if (cover && !cover.contains(event.relatedTarget)) closeTimer = setTimeout(hidePreview, 150);
  });
  shelf.addEventListener('focusin', event => {
    if (tapPreview.matches) return;
    const cover = coverFor(event.target);
    if (cover) showPreview(cover);
  });
  shelf.addEventListener('focusout', hidePreview);
  preview.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  preview.addEventListener('pointerleave', hidePreview);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hidePreview();
  });
  window.addEventListener('resize', hidePreview);
  window.addEventListener('scroll', hidePreview);

  function render() {
    hidePreview();
    const books = [...widget.querySelectorAll('.gr_custom_each_container_1788931927')];
    const perPage = size * size;
    const pages = Math.max(1, Math.ceil(books.length / perPage));
    page = Math.min(page, pages - 1);
    const start = page * perPage;

    shelf.dataset.grid = String(size);
    books.forEach((book, index) => {
      book.hidden = index < start || index >= start + perPage;
      const cover = book.querySelector('.gr_custom_book_container_1788931927 a');
      if (tapPreview.matches) cover?.setAttribute('aria-haspopup', 'dialog');
      else cover?.removeAttribute('aria-haspopup');
      const rating = book.querySelector('.gr_custom_rating_1788931927');
      if (!rating) return;
      const stars = rating.querySelectorAll('img');
      if (!stars.length) return;
      const score = [...stars].filter(star => star.src.endsWith('gr_flat_red_star_active.png')).length;
      if (score === 0) {
        rating.textContent = 'Not rated';
      } else {
        rating.setAttribute('role', 'img');
        rating.setAttribute('aria-label', `${score} out of 5 stars`);
        stars.forEach(star => star.alt = '');
      }
    });

    shelf.querySelector('.books-layout').setAttribute('aria-label', compactLayout.matches ? 'Books per page' : 'Grid size');
    shelf.querySelector('.books-layout > span').textContent = compactLayout.matches ? 'Per page' : 'Grid';
    layouts.forEach(button => {
      const grid = Number(button.dataset.gridSize);
      button.textContent = compactLayout.matches ? String(grid * grid) : `${grid} × ${grid}`;
      button.setAttribute('aria-pressed', String(grid === size));
    });
    shelf.querySelector('.books-count').textContent = books.length
      ? `${start + 1}–${Math.min(start + perPage, books.length)} of ${books.length} books`
      : 'No books yet';
    shelf.querySelector('.books-page').textContent = `Page ${page + 1} of ${pages}`;
    previous.disabled = page === 0;
    next.disabled = page >= pages - 1;
    shelf.querySelector('.books-toolbar').hidden = false;
    shelf.querySelector('.books-pagination').hidden = pages <= 1;
  }

  layouts.forEach(button => button.addEventListener('click', () => {
    size = Number(button.dataset.gridSize);
    page = 0;
    const url = new URL(location.href);
    url.searchParams.set('grid', String(size));
    history.replaceState(null, '', url);
    render();
  }));

  function turnPage(direction) {
    page += direction;
    render();
    shelf.scrollIntoView({block: 'start'});
  }
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));

  // Goodreads replaces the saved shelf after its script loads.
  new MutationObserver(render).observe(widget, {childList: true});
  compactLayout.addEventListener('change', render);
  tapPreview.addEventListener('change', render);
  render();
})();

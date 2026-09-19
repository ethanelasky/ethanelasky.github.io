(() => {
  const shelf = document.querySelector('#bookshelf');
  if (!shelf) return;

  const widget = shelf.querySelector('#gr_custom_widget_1788931927');
  const layouts = [...shelf.querySelectorAll('[data-grid-size]')];
  const previous = shelf.querySelector('[data-page="previous"]');
  const next = shelf.querySelector('[data-page="next"]');
  let size = new URL(location.href).searchParams.get('grid') === '7' ? 7 : 5;
  let page = 0;

  const preview = document.createElement('div');
  preview.id = 'book-review-preview';
  preview.className = 'book-review-preview';
  preview.setAttribute('role', 'tooltip');
  preview.hidden = true;
  const previewTitle = document.createElement('strong');
  const previewText = document.createElement('p');
  preview.append(previewTitle, previewText);
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
    const book = cover.closest('.gr_custom_each_container_1788931927');
    const review = book.querySelector('.gr_custom_review_1788931927');
    previewTitle.textContent = cover.querySelector('img')?.alt || 'Book review';
    previewText.textContent = review?.textContent.trim() || 'No written review yet.';
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

  shelf.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const cover = coverFor(event.target);
    if (cover && !cover.contains(event.relatedTarget)) showPreview(cover);
  });
  shelf.addEventListener('pointerout', event => {
    const cover = coverFor(event.target);
    if (cover && !cover.contains(event.relatedTarget)) closeTimer = setTimeout(hidePreview, 150);
  });
  shelf.addEventListener('focusin', event => {
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

    layouts.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.gridSize) === size)));
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
  render();
})();

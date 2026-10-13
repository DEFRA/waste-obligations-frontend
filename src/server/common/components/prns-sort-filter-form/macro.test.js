import { renderComponent } from '#/test-helpers/component-helpers.js'

function renderPrnsSortFilterForm(params) {
  return renderComponent(
    'prns-sort-filter-form',
    { locale: 'en', ...params },
    undefined,
    undefined,
    'appPrnsSortFilterForm'
  )
}

function buildSortFilter(overrides = {}) {
  return {
    action: '/producer/org-1/prns',
    clearHref: '/producer/org-1/prns?year=2026',
    year: 2026,
    pageSize: 20,
    sortOptions: [
      { value: 'IssuedAtDescending', text: 'Newest first', selected: true }
    ],
    filterOptions: [{ value: '', text: 'All materials', selected: true }],
    ...overrides
  }
}

describe('prns-sort-filter-form Component', () => {
  test('posts a GET request to the sort/filter action', () => {
    const $form = renderPrnsSortFilterForm({ sortFilter: buildSortFilter() })

    expect($form('form[data-prns-sort-filter]').attr('method')).toBe('get')
    expect($form('form[data-prns-sort-filter]').attr('action')).toBe(
      '/producer/org-1/prns'
    )
  })

  test('carries the year and pageSize as hidden fields when present', () => {
    const $form = renderPrnsSortFilterForm({
      sortFilter: buildSortFilter({ year: 2026, pageSize: 20 })
    })

    expect($form('input[name="year"]').val()).toBe('2026')
    expect($form('input[name="pageSize"]').val()).toBe('20')
  })

  test('omits the hidden fields when year and pageSize are absent', () => {
    const $form = renderPrnsSortFilterForm({
      sortFilter: buildSortFilter({ year: undefined, pageSize: undefined })
    })

    expect($form('input[name="year"]')).toHaveLength(0)
    expect($form('input[name="pageSize"]')).toHaveLength(0)
  })

  test('renders the sort and material filter selects with their options', () => {
    const $form = renderPrnsSortFilterForm({ sortFilter: buildSortFilter() })

    expect($form('select[name="sort"]').attr('id')).toBe('sort')
    expect($form('select[name="sort"] option:selected').text().trim()).toBe(
      'Newest first'
    )
    expect($form('select[name="material"]').attr('id')).toBe('filter')
    expect($form('select[name="material"] option:selected').text().trim()).toBe(
      'All materials'
    )
  })

  test('links clearAll to the clear href', () => {
    const $form = renderPrnsSortFilterForm({ sortFilter: buildSortFilter() })

    expect($form('#clearSortFilter').attr('href')).toBe(
      '/producer/org-1/prns?year=2026'
    )
  })
})

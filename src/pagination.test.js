import assert from 'node:assert/strict'
import test from 'node:test'

import { getVisiblePages, normalizePage } from './pagination.js'


test('shows the first five pages near the beginning', () => {
  assert.deepEqual(getVisiblePages(1, 8), [1, 2, 3, 4, 5])
})

test('centers five page buttons around the current page', () => {
  assert.deepEqual(getVisiblePages(5, 10), [3, 4, 5, 6, 7])
})

test('shows the final five pages near the end', () => {
  assert.deepEqual(getVisiblePages(10, 10), [6, 7, 8, 9, 10])
})

test('normalizes a page after the final page disappears', () => {
  assert.equal(normalizePage(4, 3), 3)
  assert.equal(normalizePage(2, 0), 1)
})

import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Grid3X3,
  ArrowRightLeft,
  Info,
} from 'lucide-react'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  generateCategorySlug,
  type CategoryWithCount,
} from '../../services/categories'
import type { CategoryRow } from '../../types/database'

// ── Delete Confirmation State ─────────────────────────────────────────────────

type DeleteStep = 'confirm' | 'reassign'

// ── Main Component ────────────────────────────────────────────────────────────

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Search / sort
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'count-desc'>('name-asc')

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete flow
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('confirm')
  const [reassignTarget, setReassignTarget] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setListError(null)
    const { data, error } = await getAdminCategories()
    setIsLoading(false)
    if (error) {
      setListError(error)
      return
    }
    setCategories(data)
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const displayed = React.useMemo(() => {
    let list = [...categories]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
      )
    }

    if (sortBy === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name))
    else if (sortBy === 'count-desc')
      list.sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0))

    return list
  }, [categories, search, sortBy])

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingCategory(null)
    setFormName('')
    setFormSlug('')
    setSlugManual(false)
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (cat: CategoryRow) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setSlugManual(true)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCategory(null)
    setFormName('')
    setFormSlug('')
    setSlugManual(false)
    setFormError(null)
  }

  const handleNameChange = (val: string) => {
    setFormName(val)
    if (!slugManual) {
      setFormSlug(generateCategorySlug(val))
    }
  }

  // ── Form Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) return setFormError('Category name is required.')
    if (!formSlug.trim()) return setFormError('Slug is required.')
    if (!/^[a-z0-9-]+$/.test(formSlug.trim())) {
      return setFormError('Slug can only contain lowercase letters, numbers, and hyphens.')
    }

    setIsSaving(true)

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, formName, formSlug)
      setIsSaving(false)
      if (error) {
        setFormError(error)
        return
      }
      showToast(`"${formName}" updated.`)
    } else {
      const { error } = await createCategory(formName, formSlug)
      setIsSaving(false)
      if (error) {
        setFormError(error)
        return
      }
      showToast(`"${formName}" created.`)
    }

    closeModal()
    loadCategories()
  }

  // ── Delete flow ───────────────────────────────────────────────────────────

  const openDeleteModal = (cat: CategoryWithCount) => {
    setDeleteTarget(cat)
    setDeleteStep('confirm')
    setReassignTarget('')
    setDeleteError(null)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteStep('confirm')
    setReassignTarget('')
    setDeleteError(null)
    setIsDeleting(false)
  }

  const handleDeleteProceed = async () => {
    if (!deleteTarget) return

    const hasProducts = (deleteTarget.product_count ?? 0) > 0

    if (hasProducts && deleteStep === 'confirm') {
      setDeleteStep('reassign')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const { success, error } = await deleteCategory(
      deleteTarget.id,
      hasProducts ? (reassignTarget || null) : undefined
    )

    setIsDeleting(false)

    if (!success || error) {
      setDeleteError(error || 'Delete failed.')
      return
    }

    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    showToast(`"${deleteTarget.name}" deleted.`)
    closeDeleteModal()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Category Management</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Organise your product catalog into categories.
            {!isLoading && (
              <span className="ml-1 font-semibold text-neutral-700">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} total.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadCategories}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          )}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-neutral-400 hover:text-neutral-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="count-desc">Most Products First</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>
      </div>

      {/* List Error */}
      {listError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error Loading Categories</p>
            <p className="mt-0.5">{listError}</p>
          </div>
        </div>
      )}

      {/* Categories Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400 mb-3" />
          <p className="text-xs text-neutral-500">Loading categories from Supabase...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-center">
          <Grid3X3 className="h-10 w-10 text-neutral-300 mb-3" />
          <p className="text-sm font-bold text-neutral-600">
            {search ? 'No Categories Match Your Search' : 'No Categories Yet'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {search ? 'Try a different search term.' : 'Add a category to start organising your products.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Category
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4 text-center">Products</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayed.map((cat) => (
                  <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                          <Tag className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{cat.name}</p>
                          <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                            {cat.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <code className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-600">
                        {cat.slug}
                      </code>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          (cat.product_count ?? 0) > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {cat.product_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                          title="Edit category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(cat)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 flex items-center justify-between text-[11px] text-neutral-400">
            <span>
              {displayed.length} of {categories.length}{' '}
              {categories.length === 1 ? 'category' : 'categories'}
            </span>
            <span>Outfit Avenue Category Manager</span>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h2 className="font-serif text-lg font-bold text-neutral-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Traditional Saree"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => {
                    setSlugManual(true)
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                  }}
                  placeholder="traditional-saree"
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-mono focus:border-neutral-900 focus:outline-none transition-colors"
                />
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400">
                  <Info className="h-3 w-3 shrink-0" />
                  Used in URLs like{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 text-[10px]">
                    /shop?category={formSlug || 'your-slug'}
                  </code>
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-4">
            {deleteStep === 'confirm' ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 mx-auto">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Delete Category</h3>
                  <p className="text-xs text-neutral-600">
                    You're about to delete <strong>"{deleteTarget.name}"</strong>.
                  </p>
                  {(deleteTarget.product_count ?? 0) > 0 ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-left flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{deleteTarget.product_count} product(s)</strong> are linked to this
                        category. You'll be asked to reassign them before deletion.
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      This category has no products. It will be permanently deleted.
                    </p>
                  )}
                </div>
                {deleteError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {deleteError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProceed}
                    disabled={isDeleting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-60"
                  >
                    {(deleteTarget.product_count ?? 0) > 0 ? (
                      <>
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Reassign & Continue</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Reassign Step */
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 mx-auto">
                  <ArrowRightLeft className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Reassign Products</h3>
                  <p className="text-xs text-neutral-600">
                    The <strong>{deleteTarget.product_count}</strong> product(s) in{' '}
                    <strong>"{deleteTarget.name}"</strong> need to be reassigned before deletion.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Move products to:
                  </label>
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">No Category (Uncategorised)</option>
                    {categories
                      .filter((c) => c.id !== deleteTarget.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-neutral-400 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Leaving blank will set products to "No Category".
                  </p>
                </div>
                {deleteError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {deleteError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProceed}
                    disabled={isDeleting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

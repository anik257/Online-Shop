import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Loader2,
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ImagePlus,
} from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { getAdminCategories } from '../../services/categories'
import type { CategoryWithCount } from '../../services/categories'
import {
  getAdminProductList,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  toggleProductAvailability,
  type ProductWithCategory,
  type AdminProductPayload,
  type AdminProductFilterOptions,
} from '../../services/products'
import { uploadProductImage, deleteProductImageByUrl } from '../../services/storage'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductFormState {
  name: string
  description: string
  category_id: string
  price: string
  discount_price: string
  stock: string
  image_url: string
  is_available: boolean
}

const BLANK_FORM: ProductFormState = {
  name: '',
  description: '',
  category_id: '',
  price: '',
  discount_price: '',
  stock: '0',
  image_url: '',
  is_available: true,
}

// ── Main Component ────────────────────────────────────────────────────────────

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAvail, setFilterAvail] = useState<'all' | 'available' | 'hidden'>('all')
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState<AdminProductFilterOptions['sortBy']>('newest')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null)
  const [form, setForm] = useState<ProductFormState>(BLANK_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setListError(null)

    const filters: AdminProductFilterOptions = {
      search: search || undefined,
      categoryId: filterCategory !== 'all' ? filterCategory : undefined,
      availability: filterAvail,
      stockFilter: filterStock,
      sortBy,
    }

    const [productsRes, categoriesRes] = await Promise.all([
      getAdminProductList(filters),
      getAdminCategories(),
    ])

    if (productsRes.error) {
      setListError(productsRes.error)
    } else {
      setProducts(productsRes.data)
    }

    if (!categoriesRes.error) {
      setCategories(categoriesRes.data)
    }

    setIsLoading(false)
  }, [search, filterCategory, filterAvail, filterStock, sortBy])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Modal Helpers ─────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingProduct(null)
    setForm(BLANK_FORM)
    setImageFile(null)
    setImagePreview(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (product: ProductWithCategory) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      price: product.price.toString(),
      discount_price: product.discount_price != null ? product.discount_price.toString() : '',
      stock: product.stock.toString(),
      image_url: product.image_url || '',
      is_available: product.is_available,
    })
    setImageFile(null)
    setImagePreview(product.image_url || null)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProduct(null)
    setForm(BLANK_FORM)
    setImageFile(null)
    setImagePreview(null)
    setFormError(null)
  }

  // ── Image Handling ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setFormError('Image file exceeds 5MB limit.')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    if (!validTypes.includes(file.type)) {
      setFormError('Please upload a JPG, PNG, WEBP, or GIF image.')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setFormError(null)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setForm((prev) => ({ ...prev, image_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Form Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const price = parseFloat(form.price)
    const discountPrice = form.discount_price ? parseFloat(form.discount_price) : null
    const stock = parseInt(form.stock, 10)

    if (!form.name.trim()) return setFormError('Product name is required.')
    if (isNaN(price) || price <= 0) return setFormError('Price must be a positive number.')
    if (discountPrice != null && (isNaN(discountPrice) || discountPrice >= price))
      return setFormError('Discount price must be less than the regular price.')
    if (isNaN(stock) || stock < 0) return setFormError('Stock must be 0 or more.')

    setIsSaving(true)

    try {
      // Upload new image if one was selected
      let finalImageUrl = form.image_url || null

      if (imageFile) {
        setIsUploading(true)
        const { url, error: uploadErr } = await uploadProductImage(imageFile)
        setIsUploading(false)

        if (uploadErr || !url) {
          setFormError(uploadErr || 'Image upload failed.')
          setIsSaving(false)
          return
        }

        // If replacing an existing image stored in our bucket, delete the old one
        if (editingProduct?.image_url && editingProduct.image_url !== url) {
          await deleteProductImageByUrl(editingProduct.image_url)
        }

        finalImageUrl = url
      }

      const payload: AdminProductPayload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        price,
        discount_price: discountPrice,
        stock,
        image_url: finalImageUrl,
        is_available: form.is_available,
      }

      if (editingProduct) {
        const { error } = await updateAdminProduct(editingProduct.id, payload)
        if (error) {
          setFormError(error)
          setIsSaving(false)
          return
        }
        showToast('Product updated successfully.')
      } else {
        const { error } = await createAdminProduct(payload)
        if (error) {
          setFormError(error)
          setIsSaving(false)
          return
        }
        showToast('Product created successfully.')
      }

      closeModal()
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setFormError(msg)
      setIsSaving(false)
    }
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────

  const handleToggleAvailability = async (product: ProductWithCategory) => {
    const { success, newStatus, error } = await toggleProductAvailability(
      product.id,
      product.is_available
    )
    if (!success || error) {
      showToast(error || 'Failed to toggle availability.', 'error')
      return
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_available: newStatus } : p))
    )
    showToast(`"${product.name}" is now ${newStatus ? 'visible in store' : 'hidden'}.`)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { success, error } = await deleteAdminProduct(deleteTarget.id)
    setIsDeleting(false)
    if (!success || error) {
      showToast(error || 'Failed to delete product.', 'error')
      setDeleteTarget(null)
      return
    }
    // Optionally delete image from storage if it's our bucket
    if (deleteTarget.image_url) {
      await deleteProductImageByUrl(deleteTarget.image_url)
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    showToast(`"${deleteTarget.name}" has been deleted.`)
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const getCategoryName = (product: ProductWithCategory) => {
    if (product.categories?.name) return product.categories.name
    if (product.category_id) {
      const cat = categories.find((c) => c.id === product.category_id)
      return cat?.name || '—'
    }
    return '—'
  }

  const getStockBadge = (stock: number) => {
    if (stock <= 0)
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
          Out of Stock
        </span>
      )
    if (stock <= 10)
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
          Low ({stock})
        </span>
      )
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
        In Stock ({stock})
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Product Management</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage catalog, pricing, stock, and availability for {BRAND.name}.
            {!isLoading && (
              <span className="ml-1 font-semibold text-neutral-700">
                {products.length} {products.length === 1 ? 'product' : 'products'} shown.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData()}
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
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
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

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-neutral-900 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Availability Filter */}
        <div className="relative">
          <select
            value={filterAvail}
            onChange={(e) => setFilterAvail(e.target.value as 'all' | 'available' | 'hidden')}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="available">Visible in Store</option>
            <option value="hidden">Hidden</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Stock Filter */}
        <div className="relative">
          <select
            value={filterStock}
            onChange={(e) =>
              setFilterStock(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')
            }
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">Healthy Stock (&gt;10)</option>
            <option value="low_stock">Low Stock (1–10)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AdminProductFilterOptions['sortBy'])}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="price-asc">Price: Low-High</option>
            <option value="price-desc">Price: High-Low</option>
            <option value="stock-asc">Stock: Low-High</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>
      </div>

      {/* ── List Error ─────────────────────────────────────────────────── */}
      {listError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error Loading Products</p>
            <p className="mt-0.5">{listError}</p>
          </div>
        </div>
      )}

      {/* ── Products Table ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-400 mb-3" />
            <p className="text-xs text-neutral-500">Loading product catalog from Supabase...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-sm font-bold text-neutral-600">No Products Found</p>
            <p className="text-xs text-neutral-400 mt-1">
              Try adjusting your search or filters, or add a new product.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4 text-center">Visible</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                    {/* Product name + image */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-400 truncate mt-0.5">
                            {product.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                        {getCategoryName(product)}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-neutral-900">
                          {BRAND.currency.symbol}
                          {Number(product.price).toLocaleString('en-BD')}
                        </span>
                        {product.discount_price != null && (
                          <div className="text-[10px] text-rose-600 font-bold">
                            Sale: {BRAND.currency.symbol}
                            {Number(product.discount_price).toLocaleString('en-BD')}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-4">{getStockBadge(product.stock)}</td>

                    {/* Availability Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(product)}
                        className="inline-flex items-center justify-center cursor-pointer"
                        title={product.is_available ? 'Click to hide from store' : 'Click to show in store'}
                      >
                        {product.is_available ? (
                          <ToggleRight className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-neutral-400" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                          title="Edit product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete product"
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
        )}

        {/* Footer */}
        {!isLoading && products.length > 0 && (
          <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 flex items-center justify-between text-[11px] text-neutral-400">
            <span>
              {products.length} {products.length === 1 ? 'product' : 'products'} total
            </span>
            <span>{BRAND.name} Inventory Management</span>
          </div>
        )}
      </div>

      {/* ── Add/Edit Product Modal ─────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h2 className="font-serif text-lg font-bold text-neutral-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error */}
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Embroidered Heritage Panjabi"
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Product details, material, sizing guidance..."
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none transition-colors"
                />
              </div>

              {/* Category, Price, Discount Price, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm bg-white focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Price (BDT) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-neutral-500">৳</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0"
                      min="1"
                      step="1"
                      required
                      className="w-full rounded-xl border border-neutral-300 py-2.5 pl-7 pr-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Discount Price{' '}
                    <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-neutral-500">৳</span>
                    <input
                      type="number"
                      value={form.discount_price}
                      onChange={(e) => setForm((p) => ({ ...p, discount_price: e.target.value }))}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full rounded-xl border border-neutral-300 py-2.5 pl-7 pr-3.5 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-400">Must be lower than regular price</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Product Image
                </label>

                {/* Preview */}
                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-32 w-32 rounded-xl border border-neutral-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer shadow-sm"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Upload Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 hover:border-neutral-400 hover:bg-neutral-50 p-5 text-center cursor-pointer transition-colors"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mb-2" />
                      <p className="text-xs text-neutral-500">Uploading to Supabase Storage...</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-neutral-400 mb-2" />
                      <p className="text-xs font-semibold text-neutral-700">
                        {imagePreview ? 'Click to replace image' : 'Click to upload image'}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-400">
                        JPG, PNG, WEBP — max 5MB. Stored in Supabase Storage.
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Or enter URL */}
                <div className="mt-2">
                  <input
                    type="url"
                    value={imageFile ? '' : form.image_url}
                    onChange={(e) => {
                      setImageFile(null)
                      setImagePreview(e.target.value || null)
                      setForm((p) => ({ ...p, image_url: e.target.value }))
                    }}
                    placeholder="Or paste an external image URL..."
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Visible in Customer Store</p>
                  <p className="text-[11px] text-neutral-500">
                    {form.is_available
                      ? 'Currently shown to customers'
                      : 'Currently hidden from storefront'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_available: !p.is_available }))}
                  className="cursor-pointer"
                >
                  {form.is_available ? (
                    <ToggleRight className="h-8 w-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-neutral-400" />
                  )}
                </button>
              </div>

              {/* Form Actions */}
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
                  disabled={isSaving || isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSaving || isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isUploading ? 'Uploading...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 mx-auto">
              <Trash2 className="h-6 w-6 text-rose-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-neutral-900">Delete Product</h3>
              <p className="text-xs text-neutral-600">
                Are you sure you want to permanently delete{' '}
                <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


import { useEffect, useState } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

function App() {
  const [products, setProducts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/products.php')

        if (!response.ok) {
          throw new Error('Failed to load products')
        }

        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Unexpected API response')
        }

        if (!cancelled) {
          setProducts(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  function refreshProducts() {
    setRefreshKey(key => key + 1)
  }

  const lowStock = products.filter(
    product => Number(product.QuantityAvailable) <= 5
  ).length

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.Price) *
      Math.max(0, Number(product.QuantityAvailable)),
    0
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>DesignerKurta</h2>
        <p>Admin Panel</p>

        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>

          <NavLink to="/products">
            Products
          </NavLink>

          <NavLink to="/orders">
            Orders
          </NavLink>

          <NavLink to="/customers">
            Customers
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                products={products}
                lowStock={lowStock}
                inventoryValue={inventoryValue}
                loading={loading}
                error={error}
              />
            }
          />

          <Route
            path="/products"
            element={
              <Products
                products={products}
                loading={loading}
                error={error}
                onProductChanged={refreshProducts}
              />
            }
          />

          
<Route
  path="/orders"
  element={<Orders onProductChanged={refreshProducts} />}
/>

<Route
  path="/customers"
  element={<Customers />}
/>


          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  )
}

function Dashboard({
  products,
  lowStock,
  inventoryValue,
  loading,
  error
}) {
  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtitle">Welcome to DesignerKurta</p>

      {loading && <p>Loading dashboard...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="stats-grid">
            <StatCard
              title="Active Products"
              value={products.length}
            />

            <StatCard
              title="Low Stock Products"
              value={lowStock}
            />

            <StatCard
              title="Total Units in Stock"
              value={products.reduce(
                (total, product) => total + Math.max(0, Number(product.QuantityAvailable) || 0),
                0
              )}
            />

            <StatCard
              title="Inventory Value"
              value={`$${inventoryValue.toFixed(2)}`}
            />
          </div>

          <section className="panel">
            <h2>Inventory Overview</h2>

            <p>
              {products.length} active products in your store.
            </p>

            {lowStock > 0 && (
              <p className="warning">
                {lowStock} products have 5 or fewer items in stock.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  )
}

function Products({
  products,
  loading,
  error,
  onProductChanged
}) {
  const emptyForm = {
    Title: '',
    Description: '',
    Size: '',
    Price: '',
    QuantityAvailable: ''
  }

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)

  function handleChange(event) {
    const { name, value } = event.target

    setForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  function handleEdit(product) {
    setEditingId(product.ListingID)

    setForm({
      Title: product.Title ?? '',
      Description: product.Description ?? '',
      Size: product.Size ?? '',
      Price: product.Price ?? '',
      QuantityAvailable: product.QuantityAvailable ?? ''
    })

    setFormError('')
    setShowForm(true)
  }

  function handleCancel() {
    setEditingId(null)
    setShowForm(false)
    setFormError('')
    setForm({ ...emptyForm })
  }

  function handleAdd() {
    handleCancel()
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setFormError('')

    try {
      const isEditing = editingId !== null

      const url = isEditing
        ? '/api/update_product.php'
        : '/api/add_product.php'

      const method = isEditing ? 'PUT' : 'POST'

      const payload = isEditing
        ? { ...form, ListingID: editingId }
        : form

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to save product'
        )
      }

      handleCancel()
      onProductChanged()

    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="subtitle">
            Manage your store inventory
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={showForm ? handleCancel : handleAdd}
        >
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <section className="panel">
          <h2>
            {editingId !== null
              ? 'Edit Product'
              : 'Add New Product'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="product-form"
          >
            <label>
              Product Title
              <input
                name="Title"
                value={form.Title}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Description
              <textarea
                name="Description"
                value={form.Description}
                onChange={handleChange}
              />
            </label>

            <label>
              Size
              <input
                name="Size"
                value={form.Size}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Price
              <input
                type="number"
                name="Price"
                min="0"
                step="0.01"
                value={form.Price}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Quantity Available
              <input
                type="number"
                name="QuantityAvailable"
                min="0"
                step="1"
                value={form.QuantityAvailable}
                onChange={handleChange}
                required
              />
            </label>

            {formError && (
              <p className="error">{formError}</p>
            )}

            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId !== null
                  ? 'Update Product'
                  : 'Save Product'}
            </button>
          </form>
        </section>
      )}

      {loading && <p>Loading products...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="panel">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map(product => (
                  <tr key={product.ListingID}>
                    <td>{product.ListingID}</td>
                    <td>{product.Title}</td>
                    <td>{product.Size}</td>
                    <td>
                      ${Number(product.Price).toFixed(2)}
                    </td>

                    <td>
                      <span
                        className={
                          Number(product.QuantityAvailable) <= 5
                            ? 'stock-warning'
                            : ''
                        }
                      >
                        {product.QuantityAvailable}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        disabled={saving}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <p>No active products found.</p>
          )}
        </section>
      )}
    </>
  )
}

function Placeholder({ title }) {
  return (
    <>
      <h1>{title}</h1>

      <section className="panel">
        <p>
          We'll build this page in the next milestone.
        </p>
      </section>
    </>
  )
}


function Customers() {
  const emptyForm = {
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Email: '',
    Address: ''
  }

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadCustomers() {
    const response = await fetch('/api/customers.php')

    if (!response.ok) {
      throw new Error('Unable to load customers')
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      throw new Error('Invalid customer data')
    }

    setCustomers(data)
  }

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        const response = await fetch('/api/customers.php')
        if (!response.ok) throw new Error('Unable to load customers')

        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid customer data')

        if (!cancelled) setCustomers(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  function handleAdd() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setFormError('')
    setSuccess('')
    setShowForm(true)
  }

  function handleEdit(customer) {
    setEditingId(customer.CustomerID)

    setForm({
      FirstName: customer.FirstName ?? '',
      MiddleName: customer.MiddleName ?? '',
      LastName: customer.LastName ?? '',
      Email: customer.Email ?? '',
      Address: customer.Address ?? ''
    })

    setFormError('')
    setSuccess('')
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...emptyForm })
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setFormError('')
    setSuccess('')

    const isEditing = editingId !== null

    try {
      const response = await fetch(
        isEditing
          ? '/api/update_customer.php'
          : '/api/add_customer.php',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(
            isEditing
              ? { ...form, CustomerID: editingId }
              : form
          )
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to save customer')
      }

      await loadCustomers()

      handleCancel()

      setSuccess(
        isEditing
          ? 'Customer updated successfully!'
          : 'Customer added successfully!'
      )

    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = customers.filter(customer =>
    [
      customer.FirstName,
      customer.MiddleName,
      customer.LastName,
      customer.Email
    ].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="subtitle">
            Manage customer records
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={showForm ? handleCancel : handleAdd}
        >
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {success && <p className="success-message">{success}</p>}

      {showForm && (
        <section className="panel">
          <h2>
            {editingId !== null
              ? 'Edit Customer'
              : 'Add New Customer'}
          </h2>

          <form className="product-form" onSubmit={handleSubmit}>
            <label>
              First Name
              <input
                name="FirstName"
                value={form.FirstName}
                onChange={handleChange}
                maxLength={50}
                required
              />
            </label>

            <label>
              Middle Name (Optional)
              <input
                name="MiddleName"
                value={form.MiddleName}
                onChange={handleChange}
                maxLength={50}
              />
            </label>

            <label>
              Last Name
              <input
                name="LastName"
                value={form.LastName}
                onChange={handleChange}
                maxLength={50}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="Email"
                value={form.Email}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </label>

            <label>
              Address
              <textarea
                name="Address"
                value={form.Address}
                onChange={handleChange}
                maxLength={255}
              />
            </label>

            {formError && <p className="error">{formError}</p>}

            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId !== null
                  ? 'Update Customer'
                  : 'Save Customer'}
            </button>
          </form>
        </section>
      )}

      <div className="stats-grid">
        <StatCard
          title="Active Customers"
          value={customers.length}
        />
      </div>

      <section className="panel">
        <div className="section-header">
          <h2>Customer Directory</h2>

          <input
            className="search-input"
            placeholder="Search customers..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        {loading && <p>Loading customers...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(customer => (
                  <tr key={customer.CustomerID}>
                    <td>#{customer.CustomerID}</td>
                    <td>
                      {[
                        customer.FirstName,
                        customer.MiddleName,
                        customer.LastName
                      ].filter(Boolean).join(' ') || 'Unknown'}
                    </td>
                    <td>{customer.Email || '—'}</td>
                    <td>{customer.Address || '—'}</td>
                    <td>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleEdit(customer)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p>No customers found.</p>
            )}
          </div>
        )}
      </section>
    </>
  )
}


function Orders({ onProductChanged }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [details, setDetails] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [updating, setUpdating] = useState(null)


const [customers, setCustomers] = useState([])
const [products, setProducts] = useState([])
const [showCreateForm, setShowCreateForm] = useState(false)
const [customerId, setCustomerId] = useState('')
const [orderItems, setOrderItems] = useState([
  { ListingID: '', Quantity: 1 }
])
const [creating, setCreating] = useState(false)
const [createError, setCreateError] = useState('')
const [createSuccess, setCreateSuccess] = useState('')

useEffect(() => {
  async function loadOptions() {
    try {
      const [customerResponse, productResponse] = await Promise.all([
        fetch('/api/customers.php'),
        fetch('/api/products.php')
      ])

      if (!customerResponse.ok || !productResponse.ok) {
        throw new Error('Unable to load order form options')
      }

      const customerData = await customerResponse.json()
      const productData = await productResponse.json()

      if (!Array.isArray(customerData) || !Array.isArray(productData)) {
        throw new Error('Invalid order form data')
      }

      setCustomers(customerData)
      setProducts(productData)
    } catch (err) {
      setCreateError(err.message)
    }
  }

  loadOptions()
}, [])

function updateOrderItem(index, field, value) {
  setOrderItems(previous =>
    previous.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
  )
}

function addOrderItem() {
  setOrderItems(previous => [
    ...previous,
    { ListingID: '', Quantity: 1 }
  ])
}

function removeOrderItem(index) {
  setOrderItems(previous =>
    previous.filter((_, i) => i !== index)
  )
}

const estimatedTotal = orderItems.reduce((sum, item) => {
  const product = products.find(
    p => String(p.ListingID) === String(item.ListingID)
  )

  return sum +
    Number(product?.Price || 0) * Number(item.Quantity || 0)
}, 0)

async function handleCreateOrder(event) {
  event.preventDefault()

  if (creating) return

  setCreating(true)
  setCreateError('')
  setCreateSuccess('')

  try {
    const response = await fetch('/api/create_order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CustomerID: Number(customerId),
        Items: orderItems.map(item => ({
          ListingID: Number(item.ListingID),
          Quantity: Number(item.Quantity)
        }))
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Unable to create order')
    }

    await loadOrders()

    // Refresh dashboard and product inventory after a successful order
    onProductChanged()

    const productResponse = await fetch('/api/products.php')
    if (productResponse.ok) {
      const productData = await productResponse.json()
      if (Array.isArray(productData)) setProducts(productData)
    }

    setShowCreateForm(false)
    setCustomerId('')
    setOrderItems([{ ListingID: '', Quantity: 1 }])
    setCreateSuccess(`Order #${result.OrderNo} created successfully!`)
  } catch (err) {
    setCreateError(err.message)
  } finally {
    setCreating(false)
  }
}


  const statuses = [
    'Pending',
    'Processing',
    'Shipped',
    'In-Transit',
    'Delivered',
    'Cancelled'
  ]

  async function loadOrders() {
    const response = await fetch('/api/orders.php')
    if (!response.ok) throw new Error('Unable to load orders')

    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Invalid order data')

    setOrders(data)
  }

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        const response = await fetch('/api/orders.php')
        if (!response.ok) throw new Error('Unable to load orders')

        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid order data')

        if (!cancelled) setOrders(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initialize()
    return () => { cancelled = true }
  }, [])

  async function viewDetails(order) {
    setSelectedOrder(order)
    setDetails([])
    setDetailsLoading(true)
    setActionError('')

    try {
      const response = await fetch(
        `/api/order_details.php?orderNo=${encodeURIComponent(order.OrderNo)}`
      )

      if (!response.ok) throw new Error('Unable to load order details')

      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid order details')

      setDetails(data)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDetailsLoading(false)
    }
  }

  async function updateStatus(orderNo, status) {
    setUpdating(orderNo)
    setActionError('')

    try {
      const response = await fetch('/api/update_order_status.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ OrderNo: orderNo, Status: status })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update status')
      }

      await loadOrders()

      if (selectedOrder?.OrderNo === orderNo) {
        setSelectedOrder(previous => ({ ...previous, Status: status }))
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.PriceTotal || 0), 0
  )

  return (
    <>
      <h1>Orders</h1>
      <p className="subtitle">Manage customer orders and fulfillment</p>

<div className="page-header">
  <button
    type="button"
    disabled={creating}
    onClick={() => {
      setShowCreateForm(previous => !previous)
      setCreateError('')
    }}
  >
    {showCreateForm ? 'Cancel' : '+ Create Order'}
  </button>
</div>

{createSuccess && (
  <p className="success-message">{createSuccess}</p>
)}

{createError && (
  <p className="error">{createError}</p>
)}

{showCreateForm && (
  <section className="panel">
    <h2>Create New Order</h2>

    <form className="product-form" onSubmit={handleCreateOrder}>
      <label>
        Customer
        <select
          value={customerId}
          onChange={event => setCustomerId(event.target.value)}
          required
        >
          <option value="">Select customer</option>
          {customers.map(customer => (
            <option
              key={customer.CustomerID}
              value={customer.CustomerID}
            >
              {customer.FirstName} {customer.LastName}
              {' '} (#{customer.CustomerID})
            </option>
          ))}
        </select>
      </label>

      <h3>Order Items</h3>

      {orderItems.map((item, index) => (
        <div className="order-item-row" key={index}>
          <label>
            Product
            <select
              value={item.ListingID}
              onChange={event =>
                updateOrderItem(index, 'ListingID', event.target.value)
              }
              required
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option
                  key={product.ListingID}
                  value={product.ListingID}
                  disabled={Number(product.QuantityAvailable) <= 0}
                >
                  {product.Title} — ${Number(product.Price).toFixed(2)}
                  {' '} (Stock: {product.QuantityAvailable})
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={item.Quantity}
              onChange={event =>
                updateOrderItem(index, 'Quantity', event.target.value)
              }
              required
            />
          </label>

          {orderItems.length > 1 && (
            <button
              type="button"
              onClick={() => removeOrderItem(index)}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addOrderItem}>
        + Add Another Product
      </button>

      <h3>Estimated Total: ${estimatedTotal.toFixed(2)}</h3>

      <button type="submit" disabled={creating}>
        {creating ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  </section>
)}


      {loading && <p>Loading orders...</p>}
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {!loading && !error && (
        <>
          <div className="stats-grid">
            <StatCard title="Total Orders" value={orders.length} />
            <StatCard
              title="Order Value"
              value={`$${totalValue.toFixed(2)}`}
            />
            <StatCard
              title="Pending Orders"
              value={orders.filter(o => o.Status === 'Pending').length}
            />
          </div>

          <section className="panel">
            <h2>All Orders</h2>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(order => (
                    <tr key={order.OrderNo}>
                      <td>#{order.OrderNo}</td>
                      <td>{order.CustomerName || `Customer #${order.CustomerID ?? 'Unknown'}`}</td>
                      <td>{order.OrderDate || '—'}</td>
                      <td>${Number(order.PriceTotal || 0).toFixed(2)}</td>
                      <td>
                        <select
                          className="status-select"
                          value={order.Status || ''}
                          disabled={updating === order.OrderNo}
                          onChange={e => updateStatus(order.OrderNo, e.target.value)}
                        >
                          {!statuses.includes(order.Status) && (
                            <option value={order.Status || ''}>
                              {order.Status || 'No status'}
                            </option>
                          )}
                          {statuses.map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button onClick={() => viewDetails(order)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && <p>No orders found.</p>}
            </div>
          </section>

          {selectedOrder && (
            <section className="panel">
              <div className="section-header">
                <h2>Order #{selectedOrder.OrderNo} Details</h2>
                <button onClick={() => setSelectedOrder(null)}>
                  Close
                </button>
              </div>

              <p>Customer: {selectedOrder.CustomerName || 'Unknown'}</p>
              <p>Shipping Address: {selectedOrder.Address || '—'}</p>

              {detailsLoading ? (
                <p>Loading order items...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map(item => (
                        <tr key={`${item.OrderNo}-${item.ListingID}`}>
                          <td>{item.Title || `Listing #${item.ListingID}`}</td>
                          <td>{item.Quantity}</td>
                          <td>${Number(item.Price || 0).toFixed(2)}</td>
                          <td>${Number(item.LineTotal || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.length === 0 && <p>No order items found.</p>}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  )
}

export default App

# Crochet Store (Next.js + MongoDB)

Mobile-first ecommerce app for a crochet business.  
Backend uses Next.js API routes with MongoDB Atlas and Mongoose.

## Run locally

```bash
npm run dev
```

Required environment variables:

- `MONGODB_URI`
- `MONGODB_DB` (optional if database name is in URI)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_ALLOWED_DEV_ORIGINS` (optional, comma-separated for LAN dev hosts)

## Product data model

Products are stored with schema validation and include:

- `name` (string, required, max 120 chars)
- `price` (number, required, min 0)
- `images` (string[], required, at least one)
- `description` (string, required, max 2000 chars)
- `status` (`in_stock` | `out_of_stock` | `preorder`)
- `isAvailable` (boolean)
- `deliveryTime` (string, default `Ships within 3-5 business days.`)
- `details` (flexible object for future product attributes)
- `createdAt`, `updatedAt` (timestamps)

The model uses the `models.Product || model("Product", ...)` pattern to prevent duplicate model compilation during Next.js hot reload/serverless execution.

## User model and roles

Users are stored with:

- `email` (string, unique)
- `passwordHash` (stored hashed password)
- `role` (`admin` | `customer`)

Role rules:

- `admin`: can create, update, and delete products
- `customer`: can browse product APIs but cannot mutate products

## Minimal authentication

Protected routes use HTTP Basic auth:

```http
Authorization: Basic <base64(email:password)>
```

This is intentionally simple for now and can be replaced later with full auth/session flows.

For local development UI, admin actions use lightweight dev headers derived from the sign in/sign up form so you can quickly test admin product management without a full auth stack.

## Product image hosting (Cloudinary)

When admin adds a product from the homepage UI, selected image files are uploaded to Cloudinary through:

- `POST /api/uploads/cloudinary`

Returned `secure_url` values are then saved in the product `images` array and displayed to all users.

## Product API

### `GET /api/products`

Returns all products (newest first).  
Optional query params:

- `status`: `in_stock`, `out_of_stock`, `preorder`
- `available`: `true` or `false`

### `POST /api/products`

Creates a product with request validation via payload checks + Mongoose schema validation.  
**Requires admin role** (Basic auth).

Example payload:

```json
{
  "name": "Daisy Keychain",
  "price": 9.99,
  "images": ["https://example.com/daisy.png"],
  "description": "Handmade crochet flower keychain.",
  "status": "in_stock",
  "isAvailable": true,
  "deliveryTime": "Ships in 2-4 business days",
  "details": {
    "color": "white-yellow",
    "material": "cotton yarn",
    "size_cm": 6
  }
}
```

### `GET /api/products/[id]`

Returns a single product by MongoDB ObjectId.

### `PUT /api/products/[id]`

Updates a product (partial update supported).  
**Requires admin role** (Basic auth).

### `DELETE /api/products/[id]`

Deletes a product.  
**Requires admin role** (Basic auth).

## User API

### `POST /api/users`

Creates a user with `email`, `password`, and optional `role`.

- `role: "customer"` can be created without auth
- `role: "admin"`:
  - allowed without auth only when no admin exists yet (first admin bootstrap)
  - otherwise requires an authenticated admin

### `GET /api/users`

Returns users list (without password hash).  
**Requires admin role**.

### `GET /api/users/me`

Returns currently authenticated user (`id`, `email`, `role`).

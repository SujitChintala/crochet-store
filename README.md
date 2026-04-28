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

## Product API

### `GET /api/products`

Returns all products (newest first).  
Optional query params:

- `status`: `in_stock`, `out_of_stock`, `preorder`
- `available`: `true` or `false`

### `POST /api/products`

Creates a product with request validation via payload checks + Mongoose schema validation.

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

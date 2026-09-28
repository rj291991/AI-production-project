export const DATABASE_SCHEMA = `
DATABASE: PostgreSQL

1. restaurants
CREATE TABLE restaurants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_restaurant_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);


2. branches
CREATE TABLE branches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    opening_time TIME,
    closing_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_branch_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id),

    CONSTRAINT chk_branch_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

RELATIONSHIP:
restaurants 1 -> N branches


3. categories
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_category_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);


4. menu_items
CREATE TABLE menu_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menu_item_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),

    CONSTRAINT chk_menu_item_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

RELATIONSHIP:
categories 1 -> N menu_items


5. branch_menu_items

This table defines which menu item is available at which branch
and stores the branch-specific price.

CREATE TABLE branch_menu_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_branch_menu_item_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),

    CONSTRAINT fk_branch_menu_item_menu
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id),

    CONSTRAINT uq_branch_menu_item
        UNIQUE (branch_id, menu_item_id),

    CONSTRAINT chk_branch_menu_item_price
        CHECK (price >= 0)
);

EXAMPLE:
Branch A + Margherita = 250
Branch B + Margherita = 280


6. branch_menu_stock

Stores stock quantity of each menu item for each branch.

CREATE TABLE branch_menu_stock (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),

    CONSTRAINT fk_stock_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id),

    CONSTRAINT uq_branch_stock_item
        UNIQUE (branch_id, menu_item_id),

    CONSTRAINT chk_stock_quantity
        CHECK (quantity >= 0)
);


7. customers
CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    phone_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_customer_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);


8. customer_addresses
CREATE TABLE customer_addresses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_address_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
);

RELATIONSHIP:
customers 1 -> N customer_addresses


9. coupons
CREATE TABLE coupons (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    max_usage_per_customer INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_coupon_discount_type
        CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),

    CONSTRAINT chk_coupon_discount_value
        CHECK (discount_value > 0),

    CONSTRAINT chk_coupon_min_order
        CHECK (min_order_amount >= 0),

    CONSTRAINT chk_coupon_dates
        CHECK (valid_until > valid_from),

    CONSTRAINT chk_coupon_status
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    CONSTRAINT chk_coupon_usage
        CHECK (
            max_usage_per_customer IS NULL
            OR max_usage_per_customer > 0
        )
);


10. orders
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    delivery_address_id BIGINT NOT NULL,
    coupon_id BIGINT,

    status VARCHAR(30) NOT NULL DEFAULT 'PLACED',

    subtotal NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,

    placed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT fk_order_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),

    CONSTRAINT fk_order_address
        FOREIGN KEY (delivery_address_id)
        REFERENCES customer_addresses(id),

    CONSTRAINT fk_order_coupon
        FOREIGN KEY (coupon_id)
        REFERENCES coupons(id),

    CONSTRAINT chk_order_status
        CHECK (
            status IN (
                'PLACED',
                'ACCEPTED',
                'PREPARING',
                'OUT_FOR_DELIVERY',
                'DELIVERED',
                'CANCELLED'
            )
        ),

    CONSTRAINT chk_order_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_order_discount
        CHECK (discount_amount >= 0),

    CONSTRAINT chk_order_delivery_fee
        CHECK (delivery_fee >= 0),

    CONSTRAINT chk_order_total
        CHECK (total_amount >= 0)
);

IMPORTANT:
1 ORDER -> 1 BRANCH

orders.branch_id determines the branch from which the order is placed.


11. order_items
CREATE TABLE order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_item_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT fk_order_item_menu
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id),

    CONSTRAINT chk_order_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_item_unit_price
        CHECK (unit_price >= 0),

    CONSTRAINT chk_order_item_total_price
        CHECK (total_price >= 0)
);

IMPORTANT:
order_items.unit_price represents the purchase-time price.


12. coupon_usages
CREATE TABLE coupon_usages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    coupon_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,

    discount_amount NUMERIC(10,2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_coupon_usage_coupon
        FOREIGN KEY (coupon_id)
        REFERENCES coupons(id),

    CONSTRAINT fk_coupon_usage_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT fk_coupon_usage_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT uq_coupon_usage_order
        UNIQUE (order_id),

    CONSTRAINT chk_coupon_usage_discount
        CHECK (discount_amount >= 0)
);


13. payments
CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,

    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    amount NUMERIC(10,2) NOT NULL,
    transaction_reference VARCHAR(255),

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT chk_payment_method
        CHECK (
            method IN (
                'UPI',
                'CARD',
                'CASH',
                'WALLET'
            )
        ),

    CONSTRAINT chk_payment_status
        CHECK (
            status IN (
                'PENDING',
                'SUCCESS',
                'FAILED',
                'REFUNDED'
            )
        ),

    CONSTRAINT chk_payment_amount
        CHECK (amount >= 0)
);


14. payment_refunds
CREATE TABLE payment_refunds (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    payment_id BIGINT NOT NULL,

    amount NUMERIC(10,2) NOT NULL,
    reason VARCHAR(255),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    refunded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refund_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id),

    CONSTRAINT chk_refund_amount
        CHECK (amount > 0),

    CONSTRAINT chk_refund_status
        CHECK (
            status IN (
                'PENDING',
                'SUCCESS',
                'FAILED'
            )
        )
);


15. delivery_partners
CREATE TABLE delivery_partners (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_delivery_partner_status
        CHECK (
            status IN (
                'AVAILABLE',
                'UNAVAILABLE'
            )
        )
);


16. order_deliveries
CREATE TABLE order_deliveries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,
    delivery_partner_id BIGINT NOT NULL,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_delivery_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT fk_order_delivery_partner
        FOREIGN KEY (delivery_partner_id)
        REFERENCES delivery_partners(id),

    CONSTRAINT uq_order_delivery_order
        UNIQUE (order_id)
);


17. reviews
CREATE TABLE reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,

    rating SMALLINT NOT NULL,
    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT fk_review_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT uq_review_order
        UNIQUE (order_id),

    CONSTRAINT chk_review_rating
        CHECK (rating BETWEEN 1 AND 5)
);


18. order_status_history
CREATE TABLE order_status_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,

    status VARCHAR(30) NOT NULL,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id),

    CONSTRAINT chk_order_history_status
        CHECK (
            status IN (
                'PLACED',
                'ACCEPTED',
                'PREPARING',
                'OUT_FOR_DELIVERY',
                'DELIVERED',
                'CANCELLED'
            )
        )
);


IMPORTANT INDEXES

PostgreSQL automatically indexes PRIMARY KEY and UNIQUE constraints,
but foreign key columns are NOT automatically indexed.

Therefore, add indexes on frequently queried foreign key columns.

CREATE INDEX idx_branches_restaurant_id
    ON branches(restaurant_id);

CREATE INDEX idx_menu_items_category_id
    ON menu_items(category_id);

CREATE INDEX idx_branch_menu_items_branch_id
    ON branch_menu_items(branch_id);

CREATE INDEX idx_branch_menu_items_menu_item_id
    ON branch_menu_items(menu_item_id);

CREATE INDEX idx_branch_menu_stock_branch_id
    ON branch_menu_stock(branch_id);

CREATE INDEX idx_customers_email
    ON customers(email);

CREATE INDEX idx_customer_addresses_customer_id
    ON customer_addresses(customer_id);

CREATE INDEX idx_orders_customer_id
    ON orders(customer_id);

CREATE INDEX idx_orders_branch_id
    ON orders(branch_id);

CREATE INDEX idx_orders_status
    ON orders(status);

CREATE INDEX idx_order_items_order_id
    ON order_items(order_id);

CREATE INDEX idx_coupon_usages_customer_id
    ON coupon_usages(customer_id);

CREATE INDEX idx_coupon_usages_coupon_id
    ON coupon_usages(coupon_id);

CREATE INDEX idx_payments_order_id
    ON payments(order_id);

CREATE INDEX idx_payment_refunds_payment_id
    ON payment_refunds(payment_id);

CREATE INDEX idx_order_deliveries_partner_id
    ON order_deliveries(delivery_partner_id);

CREATE INDEX idx_order_status_history_order_id
    ON order_status_history(order_id);

CREATE INDEX idx_reviews_customer_id
    ON reviews(customer_id);


RELATIONSHIP SUMMARY

restaurants 1 -> N branches

categories 1 -> N menu_items

branches N -> N menu_items
through branch_menu_items

branches N -> N menu_items
through branch_menu_stock

customers 1 -> N customer_addresses

customers 1 -> N orders

branches 1 -> N orders

customer_addresses 1 -> N orders

coupons 1 -> N coupon_usages

customers 1 -> N coupon_usages

orders 1 -> 1 coupon_usage

orders 1 -> N order_items

menu_items 1 -> N order_items

orders 1 -> N payments

payments 1 -> N payment_refunds

orders 1 -> 1 order_delivery

delivery_partners 1 -> N order_deliveries

orders 1 -> 1 reviews

customers 1 -> N reviews

orders 1 -> N order_status_history
`;

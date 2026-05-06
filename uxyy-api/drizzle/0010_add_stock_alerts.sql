-- 库存预警表
CREATE TABLE IF NOT EXISTS stock_alerts (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    type VARCHAR(20) NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL,
    threshold NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS stock_alerts_enterprise_idx ON stock_alerts(enterprise_id);
CREATE INDEX IF NOT EXISTS stock_alerts_product_idx ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS stock_alerts_type_idx ON stock_alerts(type);
CREATE INDEX IF NOT EXISTS stock_alerts_status_idx ON stock_alerts(status);
CREATE INDEX IF NOT EXISTS stock_alerts_created_idx ON stock_alerts(created_at);

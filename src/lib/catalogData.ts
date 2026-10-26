// Generated from the RetailX License Hub source (PLANS, FEATURE_LABELS, MODULE_METADATA, seeded projects).
// Edit src/lib/catalog.ts for logic; this file is data only.
export const CATALOG_DATA: any = {
 "plans": {
  "starter": {
   "name": "🌱 Starter Plan",
   "description": "Essential POS billing, sales history & returns, customer khata ledger, single inventory page, profile, workspace, license activation, and general print customization.",
   "max_users": 2,
   "features": {
    "dashboard": true,
    "dashboard.stats": true,
    "dashboard.financials": false,
    "dashboard.low_stock": false,
    "pos": true,
    "pos.billing": true,
    "pos.discount": true,
    "pos.direct_print": true,
    "pos.void_item": true,
    "pos.edit_price": false,
    "pos.credit_sale": false,
    "pos.quick_add_product": false,
    "pos.hold_orders": false,
    "hold_orders": false,
    "history": true,
    "history.view": true,
    "history.reprint": true,
    "history.returns": true,
    "history.reports": false,
    "customers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.cash_in_out": true,
    "customers.ledger": true,
    "inventory": true,
    "inventory.view": true,
    "inventory.product_add": true,
    "inventory.product_edit": true,
    "inventory.product_delete": true,
    "inventory.stock_adjust": false,
    "inventory.categories": true,
    "inventory.batches": false,
    "inventory.expiry": false,
    "warehouse": false,
    "warehouse.view": false,
    "warehouse.create": false,
    "warehouse.transfer": false,
    "sales": false,
    "sales.invoices": false,
    "sales.quotations": false,
    "sales.challan": false,
    "purchases": false,
    "purchases.view": false,
    "purchases.create": false,
    "purchases.suppliers": false,
    "purchases.returns": false,
    "accounting": false,
    "accounting.expenses": false,
    "accounting.banking": false,
    "accounting.chart_of_accounts": false,
    "accounting.journal": false,
    "accounting.ledger": false,
    "accounting.reports": false,
    "reports": false,
    "reports.basic": false,
    "reports.standard": false,
    "reports.advanced": false,
    "settings": true,
    "workspace": true,
    "settings.workspace": true,
    "profile": true,
    "settings.profile": true,
    "activation": true,
    "settings.activation": true,
    "print_settings": true,
    "settings.print_settings": true,
    "print_templates": true,
    "print.thermal_only": true,
    "print.all_sizes": false,
    "print_customization.designer": false,
    "print_templates.vip_extra": false,
    "print.remove_branding": false,
    "display": true,
    "settings.display": true,
    "zoom": true,
    "labels": true,
    "taxes": true,
    "variants": false,
    "units": false,
    "users": true,
    "cloud_sync": false
   }
  },
  "standard": {
   "name": "⚡ Standard Plan",
   "description": "Includes everything in Starter + Sale Invoices, Full Purchases (invoice, history, vendor khata), Warehouses, Basic Accounting, and Basic Reports.",
   "max_users": 5,
   "features": {
    "dashboard": true,
    "dashboard.stats": true,
    "dashboard.financials": true,
    "dashboard.low_stock": true,
    "pos": true,
    "pos.billing": true,
    "pos.discount": true,
    "pos.direct_print": true,
    "pos.void_item": true,
    "pos.edit_price": true,
    "pos.credit_sale": true,
    "pos.quick_add_product": true,
    "pos.hold_orders": true,
    "hold_orders": true,
    "history": true,
    "history.view": true,
    "history.reprint": true,
    "history.returns": true,
    "history.reports": true,
    "customers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.cash_in_out": true,
    "customers.ledger": true,
    "inventory": true,
    "inventory.view": true,
    "inventory.product_add": true,
    "inventory.product_edit": true,
    "inventory.product_delete": true,
    "inventory.stock_adjust": true,
    "inventory.categories": true,
    "inventory.batches": false,
    "inventory.expiry": false,
    "warehouse": true,
    "warehouse.view": true,
    "warehouse.create": true,
    "warehouse.transfer": false,
    "sales": true,
    "sales.invoices": true,
    "sales.quotations": false,
    "sales.challan": false,
    "purchases": true,
    "purchases.view": true,
    "purchases.create": true,
    "purchases.suppliers": true,
    "purchases.returns": true,
    "accounting": true,
    "accounting.expenses": true,
    "accounting.cash_in_out": true,
    "accounting.overview": true,
    "accounting.banking": false,
    "accounting.chart_of_accounts": false,
    "accounting.journal": false,
    "accounting.ledger": false,
    "accounting.reports": false,
    "reports": true,
    "reports.basic": true,
    "reports.standard": false,
    "reports.advanced": false,
    "reports.tier": "basic",
    "settings": true,
    "workspace": true,
    "settings.workspace": true,
    "profile": true,
    "settings.profile": true,
    "activation": true,
    "settings.activation": true,
    "print_settings": true,
    "settings.print_settings": true,
    "print_templates": true,
    "print.thermal_only": false,
    "print.all_sizes": true,
    "print_customization.designer": false,
    "print_templates.vip_extra": false,
    "print.remove_branding": false,
    "display": true,
    "settings.display": true,
    "zoom": true,
    "labels": true,
    "taxes": true,
    "variants": true,
    "units": true,
    "users": true,
    "cloud_sync": true
   }
  },
  "enterprise_erp": {
   "name": "🏢 Enterprise ERP (Full Access)",
   "description": "Full unrestricted access to all modules: Visual Template Studio Designer, Batch & Expiry Tracking, Inter-warehouse Transfers, Double-Entry Accounting & Unlimited Users.",
   "max_users": 50,
   "features": {
    "dashboard": true,
    "dashboard.stats": true,
    "dashboard.financials": true,
    "dashboard.low_stock": true,
    "pos": true,
    "pos.billing": true,
    "pos.discount": true,
    "pos.direct_print": true,
    "pos.void_item": true,
    "pos.edit_price": true,
    "pos.credit_sale": true,
    "pos.quick_add_product": true,
    "pos.hold_orders": true,
    "hold_orders": true,
    "history": true,
    "history.view": true,
    "history.reprint": true,
    "history.returns": true,
    "history.reports": true,
    "customers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.cash_in_out": true,
    "customers.ledger": true,
    "inventory": true,
    "inventory.view": true,
    "inventory.product_add": true,
    "inventory.product_edit": true,
    "inventory.product_delete": true,
    "inventory.stock_adjust": true,
    "inventory.categories": true,
    "inventory.batches": true,
    "inventory.expiry": true,
    "warehouse": true,
    "warehouse.view": true,
    "warehouse.create": true,
    "warehouse.transfer": true,
    "sales": true,
    "sales.invoices": true,
    "sales.quotations": true,
    "sales.challan": true,
    "purchases": true,
    "purchases.view": true,
    "purchases.create": true,
    "purchases.suppliers": true,
    "purchases.returns": true,
    "accounting": true,
    "accounting.expenses": true,
    "accounting.cash_in_out": true,
    "accounting.overview": true,
    "accounting.banking": true,
    "accounting.chart_of_accounts": true,
    "accounting.journal": true,
    "accounting.ledger": true,
    "accounting.reports": true,
    "reports": true,
    "reports.basic": true,
    "reports.standard": true,
    "reports.advanced": true,
    "reports.tier": "advanced",
    "settings": true,
    "workspace": true,
    "settings.workspace": true,
    "profile": true,
    "settings.profile": true,
    "activation": true,
    "settings.activation": true,
    "print_settings": true,
    "settings.print_settings": true,
    "print_templates": true,
    "print.thermal_only": false,
    "print.all_sizes": true,
    "print_customization.designer": true,
    "print_templates.vip_extra": true,
    "print.remove_branding": true,
    "display": true,
    "settings.display": true,
    "zoom": true,
    "labels": true,
    "taxes": true,
    "variants": true,
    "units": true,
    "users": true,
    "cloud_sync": true
   }
  }
 },
 "labels": {
  "pos": [
   "POS Terminal Master Switch",
   "Enables or disables cashier terminal interface entirely"
  ],
  "pos.billing": [
   "Barcode Billing & Quick Cart",
   "Fast barcode scanning, SKU lookup, and cart calculation"
  ],
  "pos.discount": [
   "Order & Line-Item Discounts",
   "Cashier authority to apply flat or percentage discounts"
  ],
  "pos.edit_price": [
   "Custom Price Override",
   "Allows altering product unit price directly at checkout"
  ],
  "pos.void_item": [
   "Void / Remove Items from Cart",
   "Permission to remove already scanned items"
  ],
  "pos.credit_sale": [
   "Credit Checkout (Udhar / Khata)",
   "Allows processing unpaid sales on client credit account"
  ],
  "pos.quick_add_product": [
   "Quick Product Registration",
   "Register new products directly from POS screen without opening inventory"
  ],
  "pos.direct_print": [
   "Auto ESC/POS Direct Print",
   "Instantly prints thermal receipt on sale completion without popup dialog"
  ],
  "pos.hold_orders": [
   "Multi-Tab Hold & Resume Orders",
   "Park active sales tabs to serve other customers concurrently"
  ],
  "inventory": [
   "Inventory Master Switch",
   "Complete inventory control & catalog access"
  ],
  "inventory.view": [
   "View Stock Levels",
   "View inventory listing and stock quantities"
  ],
  "inventory.product_add": [
   "Create New Products",
   "Register new items into product catalog"
  ],
  "inventory.product_edit": [
   "Edit Existing Products",
   "Modify product prices, barcode, and names"
  ],
  "inventory.product_delete": [
   "Delete Products",
   "Remove products from database catalog"
  ],
  "inventory.stock_adjust": [
   "Stock Audit & Reconciliation",
   "Manual stock increment/decrement adjustments with audit trail"
  ],
  "inventory.categories": [
   "Manage Product Categories",
   "Organize items into hierarchical categories & brands"
  ],
  "inventory.batches": [
   "Batches & Lot Tracking",
   "Track inventory by lot numbers and manufactured batches"
  ],
  "inventory.expiry": [
   "Expiry Date Tracking & Alerts",
   "Track product shelf-life and near-expiry alerts"
  ],
  "variants": [
   "Product Size & Color Variants",
   "Multi-attribute variant matrices (Sizes, Colors, Styles)"
  ],
  "units": [
   "Multiple Units of Measure (UOM)",
   "Pieces, Dozens, Boxes, Kg, Liters with auto conversion factors"
  ],
  "labels": [
   "Barcode Label Designer & Generator",
   "Print customized barcode sticker sheets for thermal printers"
  ],
  "warehouse": [
   "Multi-Warehouse Management",
   "Enable multi-depot branch inventory tracking"
  ],
  "warehouse.view": [
   "View Warehouse Inventory",
   "Inspect stock held in external warehouses"
  ],
  "warehouse.create": [
   "Create Storage Locations",
   "Add new warehouse or storage locations"
  ],
  "warehouse.transfer": [
   "Inter-Warehouse Stock Transfer",
   "Initiate and approve goods transfers between facilities"
  ],
  "purchases": [
   "Procurement Master Switch",
   "Supplier purchasing operations"
  ],
  "purchases.view": [
   "View Purchase Orders",
   "Review purchase invoices and history"
  ],
  "purchases.create": [
   "Record Stock Purchases",
   "Enter vendor bills and receive inventory"
  ],
  "purchases.suppliers": [
   "Supplier Khata & Profiles",
   "Manage supplier directory, balances, and contacts"
  ],
  "purchases.returns": [
   "Debit Note / Vendor Returns",
   "Return damaged or unsold stock to vendor with balance adjustment"
  ],
  "customers": [
   "Customers Master Switch",
   "Customer Khata management"
  ],
  "customers.view": [
   "View Customer Profiles",
   "Customer directory, address, and purchase stats"
  ],
  "customers.create": [
   "Add / Edit Customers",
   "Register new retail or wholesale client accounts"
  ],
  "customers.cash_in_out": [
   "Customer Payment Receipts",
   "Record cash received against customer outstanding ledger"
  ],
  "customers.ledger": [
   "Detailed Customer Khata Statement",
   "Export/print historical transaction ledger with debit/credit balance"
  ],
  "history": [
   "Sales History Master Switch",
   "Past transaction audit and records"
  ],
  "history.view": [
   "View Sales Archive",
   "Search and view all processed receipts"
  ],
  "history.reprint": [
   "Duplicate Thermal Receipts",
   "Reprint customer receipts with duplicate watermark"
  ],
  "history.returns": [
   "Sales Returns & Credit Notes",
   "Process customer returns and refund payments"
  ],
  "history.reports": [
   "Daily Cashier Audit Sheets",
   "End of shift cash drawer reconciliation reports"
  ],
  "accounting": [
   "Financial Accounting Master Switch",
   "Full double-entry commercial accounting system"
  ],
  "accounting.chart_of_accounts": [
   "Chart of Accounts (COA)",
   "Manage 5-tier financial accounts hierarchy"
  ],
  "accounting.journal": [
   "General Journal Entries",
   "Post double-entry journal vouchers"
  ],
  "accounting.ledger": [
   "General Ledger & Trial Balance",
   "Audit complete ledger accounts and real-time trial balance"
  ],
  "accounting.expenses": [
   "Operational Expense Management",
   "Log business expenditures by category with receipt attachments"
  ],
  "accounting.banking": [
   "Bank Accounts & Cash Books",
   "Multi-bank reconciliation and internal cash transfers"
  ],
  "accounting.reports": [
   "Balance Sheet & P&L Statement",
   "Executive financial statements and profitability sheets"
  ],
  "dashboard": [
   "Analytics Dashboard",
   "Visual analytics & KPIs"
  ],
  "dashboard.stats": [
   "Sales & Volume Metrics",
   "Revenue, average ticket size, and transaction counts"
  ],
  "dashboard.financials": [
   "Profit Margins & COGS",
   "Cost of goods sold and net margin analytics"
  ],
  "dashboard.low_stock": [
   "Critical Low Stock Alerts",
   "Visual alerts for products below safety reorder threshold"
  ],
  "reports": [
   "Reporting Hub",
   "Commercial reporting suite"
  ],
  "reports.basic": [
   "Daily Sales Summary",
   "Essential end-of-day sales report"
  ],
  "reports.standard": [
   "Product Performance & Velocity",
   "Fast-moving vs dead-stock analysis"
  ],
  "reports.advanced": [
   "Custom Date Range & Tax Reports",
   "Granular sales tax and category performance breakdown"
  ],
  "settings": [
   "Settings Hub Access",
   "System administrative settings"
  ],
  "settings.workspace": [
   "Store Header & Branding",
   "Shop name, address, NTN, and receipt header text"
  ],
  "settings.users": [
   "Granular Staff Roles & Permissions",
   "Create cashier/manager accounts with restricted access"
  ],
  "settings.taxes": [
   "Sales Tax & VAT Configuration",
   "Define standard, reduced, and zero-rated sales taxes"
  ],
  "settings.print_settings": [
   "Thermal Hardware Drivers",
   "Configure 58mm/80mm USB & Network thermal printers"
  ],
  "settings.activation": [
   "Sentinel License & Node Activation",
   "View license key and node status"
  ],
  "print_templates": [
   "Receipt Layout Presets",
   "Choose between 58mm, 80mm, and A4 invoice formats"
  ],
  "print_customization.designer": [
   "VIP Thermal Receipt Designer",
   "Visual drag-and-drop designer for thermal receipts"
  ],
  "print.remove_branding": [
   "White-Label Brand Removal",
   "Removes 'Powered by RetailX' from all customer printouts"
  ],
  "cloud_sync": [
   "Sentinel Cloud Real-Time Sync",
   "Continuous background sync with centralized license hub"
  ],
  "offline_sales": [
   "Offline Standalone Sales",
   "Process sales without internet connection"
  ],
  "bluetooth_printer": [
   "Bluetooth Thermal Printing",
   "Wireless 58mm/80mm ESC/POS printer support"
  ],
  "barcode_scanner": [
   "Camera & Hardware Barcode Scan",
   "Use smartphone camera or laser scanner for instant barcode read"
  ],
  "daily_summary": [
   "Daily Mobile Register Reports",
   "On-device cashier daily closeout summary"
  ],
  "credit_khata": [
   "Mobile Customer Khata Ledger",
   "Manage customer credit accounts directly from phone"
  ],
  "cloud_backup": [
   "Automated Cloud Backup",
   "Encrypted backup sync to cloud storage"
  ]
 },
 "modules": {
  "pos": {
   "label": "Point of Sale (POS Terminal)",
   "description": "Front-counter cashier terminal, fast billing, cart operations and order dispatching."
  },
  "inventory": {
   "label": "Inventory & Stock Control",
   "description": "Stock levels, item master records, categories, variants, and batch management."
  },
  "warehouse": {
   "label": "Multi-Warehouse & Storage",
   "description": "Multiple storage depots, inter-warehouse transfers, and bulk storage logistics."
  },
  "purchases": {
   "label": "Purchases & Vendor Procurement",
   "description": "Supplier purchase orders, receiving stock invoices, and vendor returns."
  },
  "customers": {
   "label": "Customers & Credit Khata",
   "description": "Customer profiles, credit limit enforcement, cash in/out, and customer ledger."
  },
  "history": {
   "label": "Sales History & Invoices",
   "description": "Historical sales lookup, thermal receipt re-printing, returns, and cashier audit."
  },
  "accounting": {
   "label": "Double-Entry Accounting & Ledger",
   "description": "Chart of accounts, general journal entries, accounts ledger, expenses, and banking."
  },
  "dashboard": {
   "label": "Executive Analytics & Dashboard",
   "description": "Real-time revenue metrics, gross profit analysis, and inventory valuation."
  },
  "reports": {
   "label": "Reports & Business Intelligence",
   "description": "Sales breakdowns, product performance, tax audit, and cashier reconciliation."
  },
  "settings": {
   "label": "Store Administration & Security",
   "description": "Store profile, sales tax configuration, granular staff roles, and system options."
  },
  "print": {
   "label": "Thermal Printing & Brand Customization",
   "description": "Thermal printer ESC/POS drivers, VIP receipt designer, and white-label branding."
  },
  "apk": {
   "label": "Mobile Handheld POS (Android APK)",
   "description": "Mobile offline cashier sales, Bluetooth 58/80mm printers, camera barcode scanner."
  },
  "general": {
   "label": "Sentinel Cloud & Advanced Entitlements",
   "description": "Zero-trust heartbeat synchronization, offline license validity, and cloud sync."
  }
 },
 "projectDefaults": {
  "retailx_360_web": {
   "name": "RetailX 360 Web / Desktop ERP",
   "platform": "web_desktop",
   "features": {
    "accounting": true,
    "multi_warehouse": true,
    "inventory_adv": true,
    "user_roles_adv": true,
    "vip_custom_templates": true,
    "white_label": true,
    "multi_currency": false,
    "kds_kitchen": false,
    "cloud_sync": true
   }
  },
  "retailx_360_apk": {
   "name": "RetailX 360 Mobile POS (Android APK)",
   "platform": "android_apk",
   "features": {
    "offline_sales": true,
    "bluetooth_printer": true,
    "barcode_scanner": true,
    "daily_summary": true,
    "cloud_backup": true,
    "multi_store_sync": false,
    "credit_khata": true
   }
  },
  "dpos_desktop": {
   "name": "D POS Desktop Terminal",
   "platform": "desktop",
   "features": {
    "pos.billing": true,
    "pos.discount": true,
    "pos.direct_print": true,
    "pos.void_item": true,
    "pos.edit_price": true,
    "inventory.stock": true,
    "inventory.barcode": true,
    "thermal_printer": true,
    "cash_drawer": true,
    "credit_khata": true,
    "daily_reports": true
   }
  },
  "retailx_pharmacy": {
   "name": "RetailX Pharmacy Edition",
   "platform": "web_desktop",
   "features": {
    "pos": true,
    "pos.billing": true,
    "pos.discount": true,
    "pos.direct_print": true,
    "pos.void_item": true,
    "pos.edit_price": true,
    "pos.credit_sale": true,
    "pos.quick_add_product": true,
    "pos.hold_orders": true,
    "inventory": true,
    "inventory.view": true,
    "inventory.product_add": true,
    "inventory.product_edit": true,
    "inventory.product_delete": true,
    "inventory.stock_adjust": true,
    "inventory.categories": true,
    "inventory.batches": true,
    "inventory.expiry": true,
    "variants": true,
    "units": true,
    "labels": true,
    "warehouse": false,
    "warehouse.view": false,
    "warehouse.create": false,
    "warehouse.transfer": false,
    "purchases": true,
    "purchases.view": true,
    "purchases.create": true,
    "purchases.suppliers": true,
    "purchases.returns": true,
    "customers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.cash_in_out": true,
    "customers.ledger": true,
    "history": true,
    "history.view": true,
    "history.reprint": true,
    "history.returns": true,
    "history.reports": true,
    "accounting": true,
    "accounting.chart_of_accounts": true,
    "accounting.journal": true,
    "accounting.ledger": true,
    "accounting.expenses": true,
    "accounting.banking": true,
    "accounting.reports": true,
    "dashboard": true,
    "dashboard.stats": true,
    "dashboard.financials": true,
    "dashboard.low_stock": true,
    "reports": true,
    "reports.basic": true,
    "reports.standard": true,
    "reports.advanced": true,
    "settings": true,
    "settings.workspace": true,
    "settings.users": true,
    "settings.taxes": true,
    "settings.print_settings": true,
    "settings.activation": true,
    "cloud_sync": true
   }
  }
 }
};

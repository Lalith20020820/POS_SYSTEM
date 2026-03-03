# Supermarket POS System - Project Documentation

## 1. Project Overview
Mema system eka hadanne manual bookkeeping (poth wala liweema) nathikara, supermarket ekaka badu athul kirima (Inventory), billing (Sales), saha labha alaba ganan baleema (Reporting) pahasu kireematai.

---

## 2. Business Requirements (Vyaapaara Awashyatha)

### 2.1 Inventory Management (Badu Kalamanaakaranaya)
* **Product Registry:** Hama baduwakmatama Name, Category, Buying Price, Selling Price, saha Stock Quantity athul kireema.
* **Barcode Support:** Barcode eka scan karapu saniin baduwa hadunaaganeema.
* **Stock Alerts:** Badu iwara wenna lagadi (Low stock) notification ekak labeema.

### 2.2 Sales & Billing (Wikineem saha Bila)
* **Cart System:** Badu ekathu karala eka wara bill eka kapeema.
* **Discount Management:** Bill ekata hari baduwakata hari discount ekak dima.
* **Payment Methods:** Cash hari Card hari payment eka select kireema.
* **Receipt Generation:** Print kala haki bill ekak nirmanaya kireema.

### 2.3 Supplier Management (Sapaayumkaruwan)
* Wena wena company walin badu ganna nisa, eka eka supplier ge wisthara saha eyaalayen gaththa badu wala history eka thaba ganima.

### 2.4 Reporting (Waarthaa)
* **Daily Sales:** Dawase anthimata una mulu wikineem pramanaya.
* **Profit/Margin Calc:** Buying price saha Selling price athara wenasa mase anthimata labhaya lesa penweema.

---

## 3. Technical Requirements (Thaakshunika Awashyatha)

### 3.1 Frontend Stack
* **HTML5:** System eke mulika retirement eka (Structure) sadaha.
* **Tailwind CSS:** System eka lassanata saha responsive (Mobile/Tablet/PC) widihata design kireemata.
* **JavaScript (ES6+):** System eke logic saha calculation sidu kireemata.

### 3.2 Database (Storage)
* **Dexie.js:** Browser eke data save kireema sadaha. Mekadi `IndexedDB` use wana nisa godak data pramanayak save kala hakiya.

### 3.3 Key Technical Features
* **Offline Capability:** Internet nathiwath system eka wada kala yuthuya.
* **Data Export/Backup:** Database eka JSON file ekak widihata backup gatha haki wiya yuthuya.

---

## 4. Database Schema (Data Hadunaaganeema)

Dexie.js wala data table hadiya yuthu piliwela:

* **Products:** `++id, name, barcode, buyingPrice, sellingPrice, stock, category`
* **Sales:** `++id, timestamp, totalAmount, discount, paymentMethod`
* **SaleItems:** `++id, saleId, productId, quantity, priceAtSale`
* **Suppliers:** `++id, companyName, contactPerson, phone`

---

## 5. Implementation Roadmap (Piyawaren Piyawara)

### Step 1: Basic UI Layout
Tailwind CSS use karala Dashboard eka, Inventory Page eka saha Billing (POS) Screen eka design karanna.

### Step 2: Database Setup
`dexie.js` library eka include karala database eka saha tables initialize karanna.

### Step 3: Inventory Logic
Badu athul kireema (Add), edit kireema saha delete kireema sadaha functions liyanna.

### Step 4: Billing Logic
Input ekata barcode ekak dapu saniin eya cart ekata ekathu wana widihata saha mulu mudala calculate wana widihata liyanna.

### Step 5: Final Testing
Stock iwara wana wita system eka update wana aakaaraya saha reports hariyata thibeda yanna check kireema.
const express = require("express");
const router = express.Router();

// ===============================
// CONTROLLERS
// ===============================
const companyController = require("../controllers/companyController");
const vendorController = require("../controllers/vendorController");
const transactionController = require("../controllers/transactionController");
const authController = require("../controllers/authController");
const usersController = require("../controllers/usersController");
const itemsController = require("../controllers/TransactionItemsController");

// ===============================
// MIDDLEWARE
// ===============================
const authMiddleware = require("../middleware/authMiddleware");

// ===============================
// USER ROUTES
// ===============================
router.get("/users", authMiddleware, usersController.getAllUsers);
router.get("/users/:id", authMiddleware, usersController.getUserById);
router.post("/users", authMiddleware, usersController.createUser);
router.put("/users/:id", authMiddleware, usersController.updateUser);
router.delete("/users/:id", authMiddleware, usersController.deleteUser);

// ===============================
// TRANSACTION SPECIAL ROUTES
// ===============================
router.put("/transactions/:id/cancel", transactionController.cancel);
router.get("/transactions/:id/pdf", transactionController.generatePDF);

// ===============================
// LOGIN ROUTES
// ===============================
router.post("/auth/login", authController.login);

// ===============================
// COMPANY ROUTES
// ===============================
router.post("/companies", companyController.create);
router.get("/companies", authMiddleware, companyController.list);
router.get("/companies/:id", companyController.getById);
router.put("/companies/:id", companyController.update);

// ===============================
// VENDOR ROUTES
// ===============================
router.post("/vendors/:companyId", vendorController.create);
router.get("/vendors/:companyId", vendorController.listByCompany);
router.get("/vendor/by-id/:id", vendorController.getById);
router.put("/vendor/by-id/:id", vendorController.update);
router.delete("/vendor/by-id/:id", vendorController.delete);

// ===============================
// TRANSACTION ROUTES
// ===============================
router.post("/transactions", transactionController.create);
router.get("/transactions/company/:companyId", transactionController.listByCompany);
router.get("/transactions/:id", transactionController.getById);
router.put("/transactions/:id", transactionController.update);
router.delete("/transactions/:id", transactionController.delete);

// ===============================
// TRANSACTION ITEMS ROUTES
// ===============================
router.post("/transaction-items", itemsController.create);
router.get("/transaction-items/:transactionId", itemsController.getByTransaction);
router.put("/transaction-items/:transactionId", itemsController.update);

// ===============================
// AUTH CHECK ROUTES
// ===============================
const db = require("../../config/db");

router.get("/auth/check-email", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ exists: false });

  const [rows] = await db.execute(
    "SELECT user_id FROM users WHERE JSON_EXTRACT(data,'$.email') = ?",
    [email]
  );

  res.json({ exists: rows.length > 0 });
});

router.get("/auth/check-company", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.json({ exists: false });

  const [rows] = await db.execute(
    "SELECT company_id FROM companies WHERE company_name = ?",
    [name]
  );

  if (rows.length > 0) {
    return res.json({ exists: true, company_id: rows[0].company_id });
  }

  res.json({ exists: false });
});

module.exports = router;

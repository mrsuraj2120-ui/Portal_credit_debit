const Users = require("../models/UsersModel");

exports.getAllUsers = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const users = await Users.getAllUsers(company_id);

    res.json({ success: true, users });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error fetching users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const user_id = req.params.id;

    const user = await Users.getUserById(user_id, company_id);
    if (!user) return res.json({ success: false, message: "User not found" });

    res.json({ success: true, user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error fetching user" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const data = { 
      ...req.body, 
      company_id 
    };

    const newUserId = await Users.createUser(data);

    res.json({ 
      success: true, 
      message: "User created",
      user_id: newUserId
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error creating user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const user_id = req.params.id;

    const affected = await Users.updateUser(user_id, company_id, req.body);

    if (!affected) {
      return res.json({ success: false, message: "User not found or no changes" });
    }

    res.json({ success: true, message: "User updated" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error updating user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const user_id = req.params.id;

    const affected = await Users.deleteUser(user_id, company_id);

    if (!affected) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error deleting user" });
  }
};

const express = require("express");
const { bannerController } = require("../controllers/banner.controller");

const bannerRouter = express.Router();

bannerRouter.get("/", bannerController.listPublicBanners);

module.exports = { bannerRouter };

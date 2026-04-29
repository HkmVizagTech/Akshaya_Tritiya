const Banner = require("../models/banner.model");

function isWithinSchedule(banner, now = new Date()) {
  if (banner.startsAt && banner.startsAt > now) {
    return false;
  }

  if (banner.endsAt && banner.endsAt < now) {
    return false;
  }

  return true;
}

function normalizeBannerPayload(body) {
  return {
    title: body.title?.trim(),
    desktopImageUrl: body.desktopImageUrl?.trim(),
    mobileImageUrl: body.mobileImageUrl?.trim(),
    altText: body.altText?.trim(),
    targetUrl: body.targetUrl?.trim() || "#annadaan",
    sortOrder: Number(body.sortOrder || 0),
    isActive: body.isActive !== false,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined
  };
}

const bannerController = {
  listPublicBanners: async (req, res) => {
    try {
      const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
      const activeBanners = banners.filter((banner) => isWithinSchedule(banner));

      res.status(200).json({
        success: true,
        banners: activeBanners.map((banner) => ({
          id: banner._id,
          href: banner.targetUrl,
          src: banner.desktopImageUrl,
          mobileSrc: banner.mobileImageUrl,
          alt: banner.altText,
          title: banner.title
        }))
      });
    } catch (error) {
      console.error("Public banners error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch banners" });
    }
  },

  listAdminBanners: async (req, res) => {
    try {
      const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
      res.status(200).json({ success: true, banners });
    } catch (error) {
      console.error("Admin banners error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch banners" });
    }
  },

  createBanner: async (req, res) => {
    try {
      const payload = normalizeBannerPayload(req.body);

      if (!payload.title || !payload.desktopImageUrl || !payload.mobileImageUrl || !payload.altText) {
        return res.status(400).json({
          success: false,
          message: "Title, desktop image, mobile image, and alt text are required."
        });
      }

      const banner = await Banner.create(payload);
      res.status(201).json({ success: true, banner });
    } catch (error) {
      console.error("Create banner error:", error);
      res.status(500).json({ success: false, message: "Failed to create banner" });
    }
  },

  updateBanner: async (req, res) => {
    try {
      const payload = normalizeBannerPayload(req.body);
      const banner = await Banner.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true
      });

      if (!banner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }

      res.status(200).json({ success: true, banner });
    } catch (error) {
      console.error("Update banner error:", error);
      res.status(500).json({ success: false, message: "Failed to update banner" });
    }
  },

  deleteBanner: async (req, res) => {
    try {
      const banner = await Banner.findByIdAndDelete(req.params.id);

      if (!banner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }

      res.status(200).json({ success: true, message: "Banner deleted" });
    } catch (error) {
      console.error("Delete banner error:", error);
      res.status(500).json({ success: false, message: "Failed to delete banner" });
    }
  }
};

module.exports = { bannerController };

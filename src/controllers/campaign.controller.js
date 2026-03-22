const Campaign = require('../models/campaign.model');


function normalizeCampaignName(name) {
  return name.toLowerCase().trim();
}

exports.createCampaign = async (req, res) => {
  try {
    const { name, source, medium, campaign, content, term } = req.body;
    if (!name || !source || !campaign) {
      return res.status(400).json({ message: 'Name, source, and campaign are required.' });
    }
    const normalizedCampaign = normalizeCampaignName(campaign);
    
    const exists = await Campaign.findOne({ 'utm.campaign': normalizedCampaign });
    if (exists) {
      return res.status(409).json({ message: 'Campaign with this name already exists.' });
    }
    const baseUrl = process.env.CAMPAIGN_BASE_URL || 'https://annadan.harekrishnavizag.org';
    const generatedUrl = `${baseUrl}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium||'')}&utm_campaign=${encodeURIComponent(normalizedCampaign)}${content ? `&utm_content=${encodeURIComponent(content)}` : ''}${term ? `&utm_term=${encodeURIComponent(term)}` : ''}`;
    const campaignDoc = new Campaign({
      name,
      utm: {
        source,
        medium,
        campaign: normalizedCampaign,
        content,
        term
      },
      generatedUrl
    });
    await campaignDoc.save();
    res.status(201).json({ message: 'Campaign created', campaign: campaignDoc });
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

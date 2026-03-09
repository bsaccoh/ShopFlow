const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getSettings = async (req, res) => {
    try {
        const [rows] = await query('SELECT setting_key, setting_value FROM store_settings WHERE tenant_id = ?', [req.tenantId]);
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        return sendSuccess(res, 'Settings retrieved', settings);
    } catch (error) {
        return sendError(res, 'Failed to fetch settings', error.message, 500);
    }
};

const saveSettings = async (req, res) => {
    try {
        const settings = req.body;
        if (!settings || typeof settings !== 'object') return sendError(res, 'Invalid settings data', null, 400);

        for (const [key, value] of Object.entries(settings)) {
            await query(`
                INSERT INTO store_settings (tenant_id, setting_key, setting_value)
                VALUES (?, ?, ?)
                ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
            `, [req.tenantId, key, value || null]);
        }

        if (req.audit) await req.audit('SETTINGS_UPDATE', null, null, settings);
        return sendSuccess(res, 'Settings saved');
    } catch (error) {
        return sendError(res, 'Failed to save settings', error.message, 500);
    }
};

module.exports = { getSettings, saveSettings };

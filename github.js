export default async function handler(req, res) {
    // এই তথ্যগুলো Vercel এর সিক্রেট ভল্ট থেকে আসবে
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    const REPO_NAME = 'apk-maker'; 

    const { action, runId, payload } = req.body;

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        let response;
        let data;

        if (action === 'start_build') {
            response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/workflows/apk-builder.yml/dispatches`, {
                method: 'POST', headers: headers, body: JSON.stringify({ ref: 'main', inputs: payload })
            });
            if (!response.ok) throw new Error('Failed to start build');
            return res.status(200).json({ success: true });
        }
        else if (action === 'get_run_id') {
            response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/workflows/apk-builder.yml/runs?per_page=1`, { headers });
            data = await response.json();
            return res.status(200).json(data);
        }
        else if (action === 'check_status') {
            response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/runs/${runId}`, { headers });
            data = await response.json();
            return res.status(200).json(data);
        }
        else if (action === 'get_download') {
            // গিটহাব থেকে ডাউনলোড লিংক নেওয়া
            response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/actions/runs/${runId}/artifacts`, { headers });
            data = await response.json();
            
            if (data.artifacts && data.artifacts.length > 0) {
                const downloadUrl = data.artifacts[0].archive_download_url;
                
                // সার্ভারে জিপ ফাইলটি নামানো হচ্ছে
                const zipRes = await fetch(downloadUrl, { headers });
                const arrayBuffer = await zipRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                // সরাসরি ফ্রন্টএন্ডে পাঠিয়ে দেওয়া হচ্ছে
                res.setHeader('Content-Type', 'application/zip');
                return res.status(200).send(buffer);
            } else {
                return res.status(404).json({ error: 'File not found' });
            }
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
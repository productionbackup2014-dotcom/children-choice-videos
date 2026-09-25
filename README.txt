CHILDREN CHOICE BOOKS - AUTO-FETCH SETUP

1. Keep index.html, videos-new.js, videos.json, and your existing thumbs/ and series_assets/
   folders together on the static host.

2. Create a Google Cloud API key with YouTube Data API v3 enabled. Restrict the
   key to that API. Never put the key in index.html or videos.json.

3. Put update-videos.mjs at scripts/update-videos.mjs in your repository.

4. Put update-videos.yml at .github/workflows/update-videos.yml.

5. In the GitHub repository, add an Actions secret named YOUTUBE_API_KEY.
   Run "Update YouTube videos" once from the Actions tab. It then refreshes
   videos.json daily. Commit/push permission must be enabled for Actions.

6. Deploy the folder through normal static hosting. Do not open index.html only
   through file:// when testing the live JSON fetch; use the hosted URL or a
   local web server.

The page fetches videos.json, merges it over the embedded cache, and keeps the
embedded videos if the fetch fails. Saga, Multiply, LabXpert, class, subject,
series status, and counts are recalculated from current data.

CUSTOM JSON ENDPOINT

To use another endpoint, change this line near the top of index.html:
<meta name="videos-endpoint" content="videos.json">

The endpoint may return either an array or {"videos":[...]}. Each item may be
the existing 8-value array or an object with id, title, views, duration, class,
subject, publishedAt, and series. Missing classification fields are inferred.

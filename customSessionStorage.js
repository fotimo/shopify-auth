const {Session} = require('@shopify/shopify-api/dist/auth/session');
const pool = require('./database.js');

let domain_id = '';

async function storeCallback(session) {
    try {
        let data = session;
        data.onlineAccessInfo = JSON.stringify(session.onlineAccessInfo);

        if (data.id.indexOf(`${data.shop}`) > -1) {
            domain_id = data.id;
        }
        // promise is important
        let query = new Promise((resolve, reject) => {
            pool.query(`INSERT INTO user_data (shop_url, session_id, domain_id, access_token, offline_access_token, state,
                                         is_online,
                                         online_access_info, scope)
                  VALUES ('${data.shop}', '${data.id}', '${domain_id}', '${data.accessToken}', '', '${data.state}',
                          '${data.isOnline}', '${data.onlineAccessInfo}', '${data.scope}')
                  ON DUPLICATE KEY UPDATE access_token='${data.accessToken}',
                                          state='${data.state}',
                                          is_online='${data.isOnline}',
                                          session_id='${data.id}',
                                          domain_id='${domain_id}',
                                          scope='${data.scope}',
                                          online_access_info='${data.onlineAccessInfo}'`,
                (err, results) => {
                    resolve();
                });
        });

        // You need to return a Promise like this, using .then() .catch() syntax.
        return await query
            .then(() => {
                // resolved
                return true;
            })
            .catch((err) => {
                // rejected
                console.error(`Failed to store session '${data.id}'! SQL query failed: ` + err.message);
                return false;
            });

    } catch (e) {
        throw new Error('storeCallback Function Error' + e);
    }
}

async function loadCallback(id) {
    try {
        let session = new Session(id);
        let query = new Promise((resolve, reject) => {
            pool.query(`SELECT *
                  FROM user_data
                  WHERE session_id = '${id}'
                     OR domain_id = '${id}'
                     OR shop_url = '${id}'
                  LIMIT 1`,
                (err, results) => {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    session.shop = results[0].shop_url;
                    session.state = results[0].state;
                    session.scope = results[0].scope;
                    session.isOnline = results[0].is_online == 'true' ? true : false;
                    session.onlineAccessInfo = results[0].online_access_info;
                    session.accessToken = results[0].access_token;
                    session.uid = results[0].uid;

                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    session.expires = date;

                    if (session.expires && typeof session.expires === 'string') {
                        session.expires = new Date(session.expires);
                    }

                    resolve();
                });

        });
        await query;
        return session;
    } catch (e) {
        throw new Error('loadCallback Function Error' + e);
    }
}

async function deleteCallback(id) {
    try {
        return false;
    } catch (e) {
        throw new Error('deleteCallback Function Error' + e);
    }
}

async function setOfflineAccessToken(shop, offline_access_token) {
    try {
        pool.query(`INSERT INTO user_data (shop_url, offline_access_token)
                VALUES ('${shop}', '${offline_access_token}')
                ON DUPLICATE KEY UPDATE offline_access_token='${offline_access_token}'`);
        return true;
    } catch (e) {
        throw new Error(e);
    }
}

module.exports = {
    storeCallback,
    loadCallback,
    deleteCallback,
    setOfflineAccessToken,
}



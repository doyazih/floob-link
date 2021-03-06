const VERSION = require('./package.json').version;

let appInsights = require('applicationinsights');
appInsights.setup().start();
appInsights.defaultClient.addTelemetryProcessor((envelope) => {
    envelope.tags['ai.cloud.role'] = 'link';
    envelope.tags['ai.cloud.roleInstance'] = 'floob-link';
});

const fs = require('fs');
const moment = require('moment');
const path = require('path');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const url = require('url');
const Mustache = require('mustache');
const config = require('config');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const log4js = require('log4js');
log4js.configure(config.loggers.log4js);
const logger = log4js.getLogger();

const port = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.floob.co.kr/api';

app.get('/apple-app-site-association', (req, res) => {
    res.json({
        applinks: {
            apps: [],
            details: [
                {
                    appID: 'J2DTWX5A4C.com.floob.app.ios',
                    paths: ['/*'],
                },
            ],
        },
    });
});

app.get('/meal/:mealId', (req, res) => {
    let template = fs.readFileSync(
        path.join(__dirname, './template/meal.html'),
        'utf8'
    );

    return fetch(`${API_BASE_URL}/meal`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            query: `{
                getMeal (_id: "${req.params.mealId}") {
                    _id,
                    title,
                    desc,
                    owner {
                        nickname
                    },
                    files {
                        type,
                        url
                    },
                    mealedDate
                }          
            }`,
        }),
    })
        .then((res) => {
            if (res.ok) {
                return res.json();
            } else {
                return res.json().then((message) => {
                    console.error(
                        `Floob link error occured. ${res.status} - ${
                            res.statusText
                        }\n${JSON.stringify(message)}`
                    );
                    return null;
                });
            }
        })
        .then((data) => {
            logger.debug(req.path, data);
            const DEFAULT_TITLE = 'Floob: ???????????? ??? ?????????';
            const DEFAULT_DESCRIPTION =
                'Floob?????? ????????? ???????????? ?????? ????????? ???????????? ??????????????????.';
            const DEFAULT_IMAGE_URL =
                'https://floob.blob.core.windows.net/image/floob_og.jpg';

            let title = DEFAULT_TITLE;
            let description = DEFAULT_DESCRIPTION;
            let imageUrl = DEFAULT_IMAGE_URL;

            try {
                if (data) {
                    const meal = data.data.getMeal;

                    if (meal) {
                        if (meal.owner && meal.owner.nickname) {
                            description = `@${meal.owner.nickname}`;
                        }

                        if (meal.title) {
                            description += ` ${meal.title}`;
                        } else {
                            description += ` ${convertShortenMealDateString(
                                meal.mealedDate
                            )}`;
                        }

                        if (
                            Array.isArray(meal.files) &&
                            meal.files.length > 0 &&
                            (meal.files[0].type == 'image' ||
                                meal.files[0].type == 'emoji')
                        ) {
                            imageUrl = meal.files[0].url;
                        } else {
                            imageUrl =
                                'https://floob.blob.core.windows.net/image/floob_og.jpg';
                        }
                    }
                }

                let html = Mustache.render(template, {
                    mealId: req.params.mealId,
                    url: `https://floob.co.kr/meal/${req.params.mealId}`,
                    linkUrl: `https://;link.floob.co.kr/meal/${req.params.mealId}`,
                    title: title,
                    description: description,
                    ogTitle: title,
                    ogDescription: description,
                    ogImage: imageUrl,
                });

                logger.debug('Link preview page html', html);

                res.send(html);
            } catch (err) {
                console.error('link html error', err);

                let html = Mustache.render(template, {
                    mealId: req.params.mealId,
                    url: `https://floob.co.kr/meal/${req.params.mealId}`,
                    linkUrl: `https://link.floob.co.kr/meal/${req.params.mealId}`,
                    title: DEFAULT_TITLE,
                    description: DEFAULT_DESCRIPTION,
                    ogTitle: DEFAULT_TITLE,
                    ogDescription: DEFAULT_DESCRIPTION,
                    ogImage: DEFAULT_IMAGE_URL,
                });
                res.send(html);
            }
        });
});

app.get('/story/:userId', (req, res) => {
    let template = fs.readFileSync(
        path.join(__dirname, './template/story.html'),
        'utf8'
    );

    return fetch(`${API_BASE_URL}/user`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            query: `{
                getUser (_id: "${req.params.userId}") {
                    _id,
                    nickname,
                    name,
                    introduction,
                    profileImageUrl
                }          
            }`,
        }),
    })
        .then((res) => {
            if (res.ok) {
                return res.json();
            } else {
                return res.json().then((message) => {
                    console.error(
                        `Floob link error occured. ${res.status} - ${
                            res.statusText
                        }\n${JSON.stringify(message)}`
                    );
                    return null;
                });
            }
        })
        .then((data) => {
            logger.debug(req.path, data);
            const DEFAULT_TITLE = 'Floob: ???????????? ??? ?????????';
            const DEFAULT_DESCRIPTION =
                'Floob?????? ????????? ???????????? ?????? ????????? ???????????? ??????????????????.';
            const DEFAULT_IMAGE_URL =
                'https://floob.blob.core.windows.net/image/floob_og.jpg';

            let title = DEFAULT_TITLE;
            let description = DEFAULT_DESCRIPTION;
            let imageUrl = DEFAULT_IMAGE_URL;

            try {
                if (data) {
                    const storyUser = data.data.getUser;

                    if (storyUser) {
                        if (storyUser.name) {
                            title = `${storyUser.name}`;
                            if (storyUser.nickname) {
                                title += ` ??? @${storyUser.nickname}`;
                            }
                        } else {
                            if (storyUser.nickname) {
                                title = `@${storyUser.nickname}`;
                            }
                        }

                        if (storyUser.introduction) {
                            description = storyUser.introduction;
                        }

                        if (storyUser.profileImageUrl) {
                            imageUrl = storyUser.profileImageUrl;
                        } else {
                            imageUrl =
                                'https://floob.blob.core.windows.net/image/floob_og.jpg';
                        }
                    }
                }

                let html = Mustache.render(template, {
                    userId: req.params.userId,
                    url: `https://floob.co.kr/story/${req.params.userId}`,
                    linkUrl: `https://link.floob.co.kr/story/${req.params.userId}`,
                    title: title,
                    description: description,
                    ogTitle: title,
                    ogDescription: description,
                    ogImage: imageUrl,
                });

                logger.debug('Link preview page html', html);

                res.send(html);
            } catch (err) {
                console.error('link html error', err);

                let html = Mustache.render(template, {
                    userId: req.params.userId,
                    url: `https://floob.co.kr/story/${req.params.userId}`,
                    linkUrl: `https://link.floob.co.kr/story/${req.params.userId}`,
                    title: DEFAULT_TITLE,
                    description: DEFAULT_DESCRIPTION,
                    ogTitle: DEFAULT_TITLE,
                    ogDescription: DEFAULT_DESCRIPTION,
                    ogImage: DEFAULT_IMAGE_URL,
                });
                res.send(html);
            }
        });
});

const getInstagramRequestCookie = () => {
    return process.env.INSTAGRAM_COOKIE;
};

app.post('/site-content', (req, res) => {
    let result = {
        isValid: false,
        url: req.body.url,
        headers: req.body.headers,
    };

    let siteUrl = req.body.url;
    let requestHeaders = {
        'user-agent': `FloobLink/${VERSION}`,
    };

    if (siteUrl.includes('instagram.com')) {
        requestHeaders.cookie = getInstagramRequestCookie();
        result.headers = requestHeaders;
    }

    logger.debug(`${req.path} started.`, siteUrl);

    return fetch(siteUrl, {
        method: 'GET',
        headers: requestHeaders,
    })
        .then((res) => {
            // console.log(JSON.stringify(res.headers.raw(), null, 2));
            if (res.status === 200) {
                result.isValid = true;
                return res.textConverted();
            } else {
                throw new Error(
                    `Response status ${res.status} ${res.statusText}.`
                );
            }
        })
        .then((body) => {
            logger.debug(`${req.path} responsed.`, siteUrl, body);
            const $ = cheerio.load(body);

            result.title = $('title').text();

            result.description = $('meta[name="description"]').attr('content');

            result.ogSiteName = $('meta[property="og:site_name"]').attr(
                'content'
            );
            result.ogTitle = $('meta[property="og:title"]').attr('content');
            result.ogDescription = $('meta[property="og:description"]').attr(
                'content'
            );
            result.ogImage = $('meta[property="og:image"]').attr('content');
            result.ogUrl = $('meta[property="og:url"]').attr('content');

            result.iconUrl = $(
                'link[rel="icon"], link[rel="shortcut icon"]'
            ).attr('href');

            if (
                result.iconUrl &&
                result.iconUrl.substr(0, 2) != '//' &&
                result.iconUrl[0] === '/'
            ) {
                var parsedSiteUrl = url.parse(siteUrl);
                result.iconUrl = `${parsedSiteUrl.protocol}//${parsedSiteUrl.host}${result.iconUrl}`;
            }

            return result;
        })
        .catch((err) => {
            logger.error(`${req.path} error occured. - ${siteUrl}`, err);
            result.isValid = false;
            result.error = err.message;
            return result;
        })
        .then(() => {
            res.send(result);
        });
});

app.listen(port, () => {
    logger.info(`Floob link app listening at http://localhost:${port}`);
});

const convertShortenMealDateString = (mealedDate) => {
    let mealType = convertMealType(mealedDate);
    if (mealType === 'breakfast') {
        return `${moment(mealedDate).format('M??? D???')} ??? ?????? ??????`;
    } else if (mealType === 'lunch') {
        return `${moment(mealedDate).format('M??? D???')} ??? ?????? ??????`;
    } else if (mealType === 'dinner') {
        return `${moment(mealedDate).format('M??? D???')} ??? ?????? ??????`;
    } else {
        return `${moment(mealedDate).format('M??? D???')} ??? ??????`;
    }
};

const convertMealType = (mealedDate) => {
    let mealedHour = moment(mealedDate).hours();

    if (mealedHour >= 5 && mealedHour < 11) {
        return 'breakfast';
    } else if (mealedHour >= 11 && mealedHour < 17) {
        return 'lunch';
    } else if (mealedHour >= 17 && mealedHour < 23) {
        return 'dinner';
    } else {
        return 'midnight-snack';
    }
};

const fs = require('fs');
const moment = require('moment');
const path = require('path');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const url = require('url');
const Mustache = require('mustache');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
            const DEFAULT_TITLE = 'Floob: 식사기록 인 라이프';
            const DEFAULT_DESCRIPTION =
                'Floob에서 나만의 가치있는 식사 생활을 기록하고 공유해보세요.';
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

                // console.log('Link preview page html', html);

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

app.post('/site-content', (req, res) => {
    let result = {
        isValid: false,
    };

    let siteUrl = req.body.url;

    return fetch(siteUrl)
        .then((res) => {
            // console.log(JSON.stringify(res.headers.raw(), null, 2));
            if (res.status === 200) {
                result.isValid = true;
                return res.text();
            } else {
                throw new Error('Response is not 200 OK.');
            }
        })
        .then((body) => {
            const $ = cheerio.load(body);

            result.title = $('title').text();

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
            result.isValid = false;
            result.error = err.message;
            return result;
        })
        .then(() => {
            res.send(result);
        });
});

app.listen(port, () => {
    console.log(`Floob link app listening at http://localhost:${port}`);
});

const convertShortenMealDateString = (mealedDate) => {
    let mealType = convertMealType(mealedDate);
    if (mealType === 'breakfast') {
        return `${moment(mealedDate).format('M월 D일')} • 아침 식사`;
    } else if (mealType === 'lunch') {
        return `${moment(mealedDate).format('M월 D일')} • 점심 식사`;
    } else if (mealType === 'dinner') {
        return `${moment(mealedDate).format('M월 D일')} • 저녁 식사`;
    } else {
        return `${moment(mealedDate).format('M월 D일')} • 야식`;
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

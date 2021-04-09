const fs = require('fs');
const moment = require('moment');
const path = require('path');
const fetch = require('node-fetch');
const Mustache = require('mustache');

const express = require('express');

const app = express();

const port = process.env.PORT || 3000;

app.get('/meal/:mealId', (req, res) => {
    let template = fs.readFileSync(
        path.join(__dirname, './template/meal.html'),
        'utf8'
    );

    fetch('https://floob-api.azurewebsites.net/api/meal', {
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
        .then((res) => res.json())
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

                let html = Mustache.render(template, {
                    mealId: req.params.mealId,
                    linkUrl: `https://floob.co.kr/meal/${req.params.mealId}`,
                    title: title,
                    description: description,
                    ogTitle: title,
                    ogDescription: description,
                    ogImage: imageUrl,
                });

                res.send(html);
            } catch (err) {
                console.error('link html error', err);

                let html = Mustache.render(template, {
                    mealId: req.params.mealId,
                    linkUrl: `https://floob.co.kr/meal/${req.params.mealId}`,
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

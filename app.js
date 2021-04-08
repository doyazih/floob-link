const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const express = require('express');

const app = express();

const port = process.env.PORT || 3000;

app.get('/meal/:mealId', (req, res) => {
    let template = fs.readFileSync(
        path.join(__dirname, './template/meal.html'),
        'utf8'
    );

    let html = Mustache.render(template, {
        mealId: req.params.mealId,
        link: `https://floob.co.kr/meal/${req.params.mealId}`,
        ogTitle: 'Floob: 식사기록 인 라이프',
        ogDescription: '@floob: 새송이버섯 간장조림덮밥',
        ogImage: 'https://blob.floob.co.kr/meal/tfekaI5zT',
    });

    res.send(html);
});

app.listen(port, () => {
    console.log(`Floob link app listening at http://localhost:${port}`);
});

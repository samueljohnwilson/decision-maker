"use strict";

const express = require('express');
const router  = express.Router();
const math = require('../public/scripts/math');
const mailgun = require('./util/mailgun.js');

module.exports = (knex) => {

  router.get("/poll", (req, res) => {
    knex
      .select("*")
      .from("poll")
      .then((results) => {
        res.json(results);
    });
  });

  router.get("/poll/:pid/results", (req, res) => {
    knex
      .select("poll.options", "poll.question", "response.ranks")
      .from("poll")
      .join("response", {"poll.url": "poll_url"})
      .where({ "poll.url": req.params.pid })
      .then((results) => {
        const options = results[0].options;
        const question = results[0].question;
        const rankedArray = [];

        // Get ranks array from each response in db
        results.forEach((result) => {
          rankedArray.push(result.ranks);
        });

        // Sum ranks by index in rankedArray
        let ranks = rankedArray.reduce((accumulator, current) => {
          current.forEach((num, i) => {
            accumulator[i] = (accumulator[i] || 0) + num;
          });
          return accumulator;
        }, []);

        res.json({ options, question, ranks });
      });
  });

  router.get("/", (req, res) => {
    knex
      .select("*")
      .from("poll")
      .then((results) => {
        res.json(results);
    });
  });

  router.post("/poll", (req, res) => {
    let optionArr = [];
    let val = Object.values(req.body);
    let key = Object.keys(req.body)
    for (let i = 0; i < val.length; i++) {
      if (key[i].includes("option")) {
        optionArr.push(val[i]);
      }
    }
    const pollUrl = math.generateRandomString(10);
    const emails = req.body.emails.split(', ');
    const newPoll = {
      question: req.body.question,
      email: req.body.email,
      options: optionArr,
      url: pollUrl,
      emails: emails
    };

    knex('poll')
      .insert(newPoll)
      .then(rows => {
        console.log(rows);
      })
      .catch(error => console.error(error));

    mailgun.sendEmail(newPoll);

    res.redirect(`/poll/${pollUrl}`);
  });

  router.post("/poll/:pid/results", (req, res) => {
    const newResponse = {
      ranks: JSON.parse(req.body.ranking),
      poll_url: req.params.pid
  };


    knex('response')
      .insert(newResponse)
      .then(rows => console.log(rows))
      .catch(error => console.error(error));

    const redirect = `/poll/${req.params.pid}/results`;
    res.json({ redirect });
  });

  return router;
}

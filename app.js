const express = require("express");
const conn = require('./connection/connectDB');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
require('dotenv').config()
const app = express();
const router = express.Router();
const cookieParser = require('cookie-parser')
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
var jwt = require('jsonwebtoken');


app.get('/register', (req, res) => {
    res.render('register')
})
app.get('/login', (req, res) => {
    let error = false;
    res.render('login', { error })
})

app.post('/', (req, res) => {
    const { name, email, password, cpassword, } = req.body;
    console.log(name, email, password, cpassword);

    async function register(name, email, password, cpassword) {
        try {
            if (!(email && password && name && cpassword)) {
                res.status(400).send("All input is required");
            }
            const qry1 = `select * from Jwt_prac.users where email='${email}'`
            // console.log(qry1);
            const oldUser = await queryExecuter(qry1)
            // console.log(oldUser);
            if (oldUser.length != 0) {
                return res.render('Error_Page');
            }
            else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                const hashedcPassword = await bcrypt.hash(cpassword, salt);
                const qry = `INSERT INTO Jwt_prac.users (name, email, password,cpassword) VALUES ('${name}', '${email}', '${hashedPassword}', '${hashedcPassword}')`
                const result = await queryExecuter(qry)

                if (result) {
                    res.redirect('/login')

                }
            }
        } catch (error) {
            throw error;
        }
    }

    register(name, email, password, cpassword)
})

app.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body
        // console.log(email, password);
        let log_qry = `select * from Jwt_prac.users where email='${email}'`;
        const result = await queryExecuter(log_qry);
        if (result.length == 0) {
            return res.status(401).send('Invalid credentials');
        }
        // console.log(result);
        let dbPassword = result[0].password;
        let UserData = result[0];
        async function checkUser(email, password) {
            const match = await bcrypt.compare(password, dbPassword);
            if (match) {
                const token = jwt.sign({ UserData }, process.env.JWT_SECRET);
                // res.status(201).json(token);
                res.cookie('Access_token', token)
                res.redirect('/home')
            }
            else {
                let error = true
                res.render("login", { error })
            }
        }
        checkUser(email, password)
    } catch (error) {
        throw error
    }


    app.get('/home', async (req, res) => {
        console.log("here");
        const token = await req.cookies['Access_token'];

        if (!token) {
            res.redirect('/login')
        }
        else {
            const verified = jwt.verify(token, process.env.JWT_SECRET)
            res.render('home', { user: verified.UserData });
        }

    })

})
async function queryExecuter(query) {
    return new Promise((resolve, rejects) => {
        conn.query(query, (err, result) => {
            if (err) {
                rejects(err);
            }
            resolve(result);
        });
    })
}
app.listen(process.env.Port, console.log(`Server start on port ${process.env.Port}`));
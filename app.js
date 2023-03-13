const express = require("express");
const conn = require('./connection/connectDB');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config()
const app = express();
const router = express.Router();
const cookieParser = require('cookie-parser')
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
console.log(__dirname + '/public');
app.set("view engine", "ejs");
var jwt = require('jsonwebtoken');
const expiresIn = 3600; //


app.get('/register', (req, res) => {
    let flag = false
    res.render('register', { flag })
})
app.get('/login', async (req, res) => {
    let solve
    let error 
    // console.log("here");
    const token = await req.cookies['Access_token'];
    if(token){
        try {
     
            solve = jwt.verify(token, process.env.JWT_SECRET);
            
        } catch (error) {
             err = false;
            res.render('login', { error })
        }        
    }

    if (token && solve) {
        res.redirect('/home')
    }
    else {
          error = false;
        res.render('login', { error })
    }

})

app.post('/checkuser', async (req, res) => {
    const { data } = req.body
    // console.log(data);

    const qry1 = `select * from Jwt_prac.users where name='${data}'`
    // console.log(qry1);
    const oldUser = await queryExecuter(qry1)
    if (oldUser.length == 0) {
        let isNew = true
        res.json({ isNew });
    }
    else {
        let isNew = false
        res.json({ isNew });
    }
})
app.post('/checkuseremail', async (req, res) => {
    const { data } = req.body
    const qry1 = `select * from Jwt_prac.users where email='${data}'`
    const oldUser = await queryExecuter(qry1)
    if (oldUser.length == 0) {
        let isNew = true
        res.json({ isNew });
    }
    else {
        let isNew = false
        res.json({ isNew });
    }
})
//register
app.post('/', (req, res) => {
    const { name, email, password, cpassword, } = req.body;
    // console.log(name, email, password, cpassword);

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
                let flag = true
                return res.render('register', { flag });
            }
            else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                const hashedcPassword = await bcrypt.hash(cpassword, salt);
                const qry = `INSERT INTO Jwt_prac.users (name, email, password,cpassword) VALUES ('${name}', '${email}', '${hashedPassword}', '${hashedcPassword}')`
                const result = await queryExecuter(qry)

                if (result) {

                    // console.log(result);
                    let id = result.insertId
                    // console.log(id);
                    const token = crypto.randomBytes(32).toString('hex');

                    const activationUrl = `https://example.com/activate-account/${token}`;

                    res.render('activate_page', { activated: false, activationUrl: activationUrl, userID: id });


                }
            }
        } catch (error) {
            throw error;
        }
    }

    register(name, email, password, cpassword)
})
app.get('/actiivateUser', async (req, res) => {
    const userID = req.query.id;
    // console.log(userID);
    const update_query = `UPDATE Jwt_prac.users SET isActive = '1' WHERE (id = ${parseInt(userID)});`
    const result = await queryExecuter(update_query);
    // res.render('activate_page', { activated: true });
    res.redirect('/login')

})
app.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body
        // console.log(email, password);
        let log_qry = `select * from Jwt_prac.users where email='${email}' and isActive = '1'`;

        const result = await queryExecuter(log_qry);
        // console.log(result);
        if (result.length == 0) {
            return res.status(401).send('Invalid credentials');
        }
        else if (result[0].isActive == '0') {
            let id = result[0].id
            // console.log(id);
            return res.render('activate_page', { activated: false, activationUrl: activationUrl, userID: id })
        }
        // console.log(result);
        let dbPassword = result[0].password;
        let UserData = result[0];
        async function checkUser(email, password) {
            const match = await bcrypt.compare(password, dbPassword);
            if (match) {
                const token = jwt.sign({ UserData }, process.env.JWT_SECRET ,{expiresIn});
                // res.status(201).json(token);
                res.cookie('Access_token', token , { httpOnly: true })
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
})

app.get('/home', async (req, res) => {
    // console.log("here");
    const token = await req.cookies['Access_token'];

    if (!token) {
        res.redirect('/login')
    }
    else {
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        // console.log(verified);
        res.render('home', { user: verified.UserData });
    }

})

app.post('/logout', (req, res) => {
    res.clearCookie('Access_token');
    res.redirect('/login');
})

let name
let email;
app.get('/update/:id', async (req, res) => {
    let get_id = req.params.id;
    const token = await req.cookies['Access_token'];
    let decode = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decode.UserData.id);
    if (decode.UserData.id != get_id) {

        console.log("i am here");
        return res.render("unauth")
    }
    // console.log(get_id);
    let qrygetname = `select name from Jwt_prac.users where id=${get_id};`
    conn.query(qrygetname, (err, result) => {
        if (err) return err;
        else {
            name = result[0].name
        }
    })
    let qrygetemail = `select email from Jwt_prac.users where id=${get_id};`
    conn.query(qrygetemail, (err, result) => {
        if (err) return err;
        else {
            email = result[0].email;


        }
        let msg = false
        let error = false
        res.render('update', { name, email, get_id, msg, error })
    })

})
app.post('/update/:id', (req, res) => {
    let get_id = req.query.id;

    const { email, password, newpassword, name } = req.body;
    // console.log(email, name, password, newpassword);

    async function updateUser(email, password, newpassword, name) {
        if (!(email && password && name && newpassword)) {
            res.status(400).send("All input is required");
        }
        const qry1 = `select * from Jwt_prac.users where email='${email}'`
        // console.log(qry1);
        const oldPass = await queryExecuter(qry1)
        // console.log(oldPass);
        if (oldPass.length == 0) {
            let error = true
            let msg = false
            // console.log("i am here");
            return res.render("update", { msg, error, get_id, name, email })
        }

        async function checkUser(email, password) {
            const match = await bcrypt.compare(password, oldPass[0].password);
            if (match) {

                if (password == newpassword) {
                    let error = true
                    let msg = false
                    return res.render("update", { msg, error, get_id, name, email })
                }
                else {
                    const salt = await bcrypt.genSalt(10);
                    const newhashedPassword = await bcrypt.hash(newpassword, salt);
                    const qry = `update Jwt_prac.users set name = '${name}', password='${newhashedPassword}' where email='${email}'`
                    const result = await queryExecuter(qry)
                    if (result) {
                        let msg = true
                        let error = false
                        // console.log("I am here");
                        return res.render('update', { error, msg, get_id, name, email })

                    }
                }

            }
            else {
                let error = true
                let msg = false
                return res.render("update", { msg, error, get_id, name, email })
            }
        }
        checkUser(email, password)
    }

    updateUser(email, password, newpassword, name)
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
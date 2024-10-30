/*
    a .env file szerint már tudunk csatlakozni az adatbázishoz 
    DB_HOST=127.0.0.1
    DB_USER=root 
    DB_PASS=
    DB_NAME=jofogas_clone ... 

    És ide az első dolog, hogy be kell importálni a pool-t amit csináltunk!! Conn.ts-en 
    ->
    import pool from "./backend/frameworks/Conn.js";
    és nem felejtjük el odaírni, hogy .js utána!!! 
*/
import { PoolConnection, Query } from "mysql2";
import pool from "./frameworks/Conn.js";
import http from "./frameworks/HTTP.js";
import { Request, Response } from "express";
import SqlQueryBuilder from "./frameworks/sqlQueryBuilder.js";
import { joinTypes } from "./app/models/types.js";

async function getSomething():Promise<void> {
    /*
        Ha a limit szerint még van szabad connection, akkor abból kiveszük egyet
        és felhasználjuk!! 
        Ha nincsen, akkor addig várunk a beállításunk szerint, ameddig nem lesz 
        Ez volt a -> waitForConnections: true 
            Tehát nem dobja el a kérést, hanem addig vár, ameddig nem lesz szabad 
    */
    const conn:any = await pool.promise().getConnection();

    const response:Query = await conn.query("SELECT * FROM users");
    console.log(response);
}



http.get("/something", (req:Request, res:Response)=> {
    res.status(200).json("{importantData:123");
});


//Az SqlQueryBuilder-ből csinálunk egy példányt!! SqlQueryBuilder.ts
const qb:SqlQueryBuilder = new SqlQueryBuilder();
//és onnan meghívjuk a public függvényeket, pl. a select-et, ami összerak nekünk egy sql stringe-t
//ez vár egy table-t meg egy fields-t, ami egy array lesz és azt a select függvényen belül join-oltuk vesszők mellett 
qb.select("users", ["userID", "email", "pass"]);

/*
    És mivel ezek a függvények egy this-t adnak vissza, egy SqlQueryBuilder-t, tehát önmagát adja vissza!!! 
    -> 
    public select(table:string, fields:string[]):SqlQueryBuilder*** {
        this.sql += `SELECT ${fields.join(", ")} FROM ${table}}`
        return this;***
    }
    Tehát ebből meg tudjuk hívni az összes metódust, ilyen chain-elős (lácolásos) megoldás!! 

    de viszont itt jön egy probléma, hogy nem mindig amikor WHERE van, akkor = jel is
    ezért be kell azt is kérni és itt meghívásnál megadni 
    
    public where(field:string, value:string):SqlQueryBuilder {
        this.sql += `WHERE ${field} = ?`
        this.values.push(value);
        return this;
    }

    ->

    public where(field:string, operation:string****, value:string):SqlQueryBuilder {
        this.sql += `WHERE ${field}  ${operation}?`****
        this.values.push(value);
        return this;
    }

    Most itt meghívásál egy = lesz, de azt is megcsinálhatnánk, hogy LIKE 
    ->
    qb.select("uesrs", ["userID", "email", "pass"]).where("email", "=", "");
    qb.select("uesrs", ["userID", "email", "pass"]).where("email", "LIKE", "");

    Ebből meg tudjuk hívni a getSql-t 
        és mivel az utolsó getSql, ezért ez már nekünk egy sql string-et fog visszaadni 

    public getSql():string {
        return this.sql;
    }

    qb.select("users", ["userID", "email", "pass"]).where("email", "=", "").getSql()***;
    

*/

let sql = qb.select("uesrs", ["userID", "email", "pass"]).where("email", "=", "").getSql();
console.log(sql);
/*
SELECT userID, email, pass FROM users WHERE email = ?
És ha ezt egyszer megcsináltuk, akkor nincsen több hibázási lehetőség, hogy azt írjuk, hogy SELCET mondjuk, hanem csak egyszer kell 
    figyelni, amikor megcsináljuk ez a select függvényt!! és akkor azt meg lehet hívni 
*/

//insert()-nek a meghívása
let sql1 = qb.insert("users", {
    "email":"asdf@asdf.hu",
    "pass":"asdf",
    "isAdmin":0
}).getSql;
/*
    INSERT INTO users (email, pass, isAdmin)
    VALUES(?,?,?)
    Ha meg akarjuk nézni, hogy mi van a values-ban, akkor azt ki kell loggolni 
    -> 
        public insert(table:string, fieldsValues:Record<string, any>):SqlQueryBuilder {
            ...
            VALUES(${getQuestionMarks(Object.keys(fieldsValues))})`

            this.values.push(...Object.values(fieldsValues));
            console.log(this.values);***** -> ['asdf@asdf.hu', 'asdf', 0]
*/

let sql3:string = qb.select("users", ["users.userID", "users.email"]) 
.join(joinTypes.INNER, "ratings", ["users.userID", "ratings.userID"]).getSql();
console.log(sql3);
/*
    SELECT userID, email FROM users INNER JOIN ratings ON users.userID = ratings.userID

    let sql3:string = qb.select("users", ["userID", "email"]) 
    És ha itt esetleg kétértelmű mezők vannak, mert a mindkét táblában ugyanaz a mezőnév, akkor azt tudjuk itt mondani, hogy 
    ->
    let sql3:string = qb.select("users", ["users****.userID", "users****.email"]) 

*/
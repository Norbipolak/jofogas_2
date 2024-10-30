/*
    Itt importálni kell az adatbáziskapcsolatot 
*/
import { joinTypes } from "../app/models/types.js";
import pool from "./Conn.js";
import getQuestionMarks from "./getQuestionMarks.js";

class SqlQueryBuilder {
    private sql:string;
    private conn:any;
    private values:any[];

    constructor() {
        this.getConnection();
        this.values = [];
        this.sql = "";
    }

    public async getConnection():Promise<void> {
        //itt megszerezzük a connection-t, de ezt fontos, hogy meg kell hívni a constructor-ben!!! 
        this.conn = await pool.promise().getConnection();
    }

    /*
        table -> tábla, amiből le akarunk kérdezni 
        field(values) -> egy objektum, kulcs-értékpárokkal (pl. {id: 1, userName: "asdfasdf"})
        De ez majd csak a insert-nél is mivel most egy select van ezért -> Record<string, any>
        a table:string mellett van egy fields, ami egy string array -> fields:string[]
        fields -> string array, a lekérdezendő mezőkkel 
    */

    public select(table:string, fields:string[]):SqlQueryBuilder {
        //elő kell állítani egy sql string-et 
        //mert a fields az egy tömb, amiben vannak a mezők, de mi itt azt akarjuk, hogy egymás mellett fel legyenek sorolva string-ként 
        //fields.join(", ")

        this.sql += `SELECT ${fields.join(", ")} FROM ${table}} `;
        return this;

        /*
            Ha azt mondjuk, hogy return this, akkor azt lehet csinálni, hogy létrehozunk egy public where és majd össze lehet füzni őket!! 
        */
    }

    public where(field:string, operation:string, value:string):SqlQueryBuilder {
        /*
            két dolgot vár, mert egy where az úgy néz ki, hogy meg kell adni, hogy minél (field) mi legyen az érték (value) 
            pl. WHERE userName = "asdfasdf"
            de mivel itt mi prepared statement-ekkel dolgozunk, ezért így lesz 
            ->
            `WHERE ${field} = ?`
            de akkor hova megy a value 
            -> 
            létrehozunk egy private values, ami egy tömb lesz és any értéket tud fogadni -> private values:any[];
            de minden változónak amit létrehoztunk kell adni egy értéket a constructor-ban 
            ezért a values-nak az értéke egy üres tömb lesz! 
            ->
                constructor() {
            this.getConnection();
            this.values = [];   ****
            this.sql = ""; ennek az értéke meg egy üres string, amihez hozzáfüzzük majd a dolgokat, amiket itt csinálunk -> this.sql += 
                ha valamilyen változónak a constructor-ban nem adunk értéket, akkor az undefined lesz és abból probléma lesz 
            }
        */
        //hozzáfüzzük az sql változóhoz 
        this.sql += `WHERE ${field} ${operation} ? `;
        //a values-ba meg belerakjuk a value-t, amit bekér a függvény és majd meghatározunk meghívásnál 
        this.values.push(value);

        //és ez is egy SqlQueryBuilder-t fog visszaadni és azt mondjuk, hogy return this
        return this;
    }

    /*
        Hogyan tudjuk ezeket használni 
        Csinálunk egy getSql-t, ami visszaad ideiglenes egy string-et -> return this.sql
    */
    public getSql():string {
        return this.sql;
    }

    /*
        Az index-ts-ben fogjuk ezt csinálni a behívást 
        ->
    */

    //megcsináljuk az össszes sql parancsra az sql string-et AND, OR... 
    public and(field:string, operation:string, value:string):SqlQueryBuilder {
        this.sql += `AND ${field} ${operation} ? `; //itt fontos, hogy hagyni kell egy szóközt, mert összefűzésnél nehogy egybe legyen a kettő
        this.values.push(value);
        return this;
    }

    public or(field:string, operation:string, value:string):SqlQueryBuilder {
        this.sql += `OR ${field} ${operation} ? `;
        this.values.push(value);
        return this;
    }

    /*
        !!!!!!!!!!
        És az a jó, hogy ezek a value-k, amiket bekér a where, and, or függvény azok bemennek itt az osztályban létrehozott 
            values tömbbe és a végrehajtásnál sem lesz probléma, mert meg vannak azok a value-k, amikre szükségünk van!!! 
    */

    /*
        Az IN egy kicsit máshogy néz ki, mert egy field van, de viszont több értéket és megadunk az in-ben 
            és annyi kérdőjelet kell belerakni az in-be, amennyi értéke van a values tömbnek 
            mert ugye ott több értéket is megadhatunk, akár number-t is, ezért az egy any array lesz 
            ->
            Ezt meg úgy tudjuk megcsinálni, hogy a values-on amit bekérünk végigmegyünk egy map-vel és minden körben hozzáadunk egy ?-t 
            ->
            IN(${values.map(fv=>"?")}
            Ez visszaad egy olyan tömböt, amiben csak kérdőjelek vannak 
            És ha ez join(",")-oljuk, akkor ezeket ?-t elválasztja egy , és string lesz 
            ->
            IN(${values.map(fv=>"?").join(",")
            pl. 
            const fruits = ["apple", "banana", "cherry"];
            const results = fruits.join(" - ");
            console.log(results) -> "apple - banana - cherry

            vagy a mi esetünkben 
            arr = ["a", "b", "c"];
            console.log(arr.map(v=>"?").join(",")); -> ?,?,? 
            Tehát visszaad annyi ? jelet a map() segítségével, ahány eleme volt a tömbnek (arr) és utána ezeket join-olja vesszővel elválasztva 7



    */
    public in(field:string, values:any[], andOrWhere:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} IN(${values.map(v=>"?").join(",")}) `;
        this.values.push(...values);
        return this;
        /*
            Itt meg, amikor kibontja az értékeket egymás utána belerakja - spread operator 
            SQL lekérdezés összeállítása 
                A map(fv => "?").join(",") rész létrehoz egy olyan karakterláncot (string), amely ? karakteeket tartalmaz 
                vesszővel elválasztva ("?,?,?")
             
            push(...values) használata 
                - a spread operátor (...values) azt jelenti, hogy a values tömb minden egyes elemét külön-külön hozzáadja a this.values-hoz 
                tehát ahhoz amit létrehoztunk változót itt az osztályban és makd ez lesz neki az értéke 
                - így pl. values = [1, 2, 3] akkor a this.values.push(...values) ekvivalens ezzel this.values.push(1, 2, 3);
                -Ezzel bíztosítjuk, hogy minden ? karakterhez a megfelelő értékek egyenként kerüljenek be, 
                és késöbb a lekérdezés futtatásakor megfelelően lehessen őket behelyetesíteni 
                
            azért hoztuk létre ezt az andOrWhere-t, mert nem biztos, hogy where van itt a lekérdezés elején hanem lehet AND is 
            ha nem az első feltétel amit megadunk 
            tehát ezt is bekérjük majd és meghíváskor megadjuk, hogy WHERE vagy AND kell nekünk
            -> 
            public in(field:string, values:any[], andOrWhere:string****):SqlQueryBuilder {
                this.sql += `${andOrWhere}***** ${field} IN(${values.map(v=>"?").join(",")}) ` 
                this.values.push(...values);

        */       
    }

    between(field:string, values:[any, any], andOrWhere:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} BETWEEN ? AND ?}} `;
        this.values.push(...values);
        return this;
    }
    /*
        A between az kér majd két értéket, hogy mi között legyen a between 
        1. ezt úgy is meg lehet oldani, hogy bekérjük külön két value-t 
        ->
        between(field:string, value1:any, value2:any) 
        2. vagy úgy is, hogy egy value-t kérünk be, ami egy any array lesz 
        ->
        between(field:string, values:any[]****, andOrWhere:string):SqlQueryBuilder {
            this.sql += `${andOrWhere} ${field} BETWEEN ${values[0]}*** ${values[1]}***} `
        és itt az első érték a tömb nulladik eleme lesz a második meg az első eleme a tömbnek   
        3. megoldás meg, hogy values az egy tuple, ami any, any kér, tehát két értéket, amik bármik lehetnek majd!! 
        Ezért jó, mert csak olyat lehet neki adni meghívásnál, ami 2 elemű array!!! 
        between(field:string, values:[any, any]********, andOrWhere:string):SqlQueryBuilder {
        this.sql += `${andOrWhere} ${field} BETWEEN ${values[0]} ${values[1]}} `;

        Ez még azért nem jó, mert nem prepared statement-es (kellenek a ? jelek) 
        és a this.values-ba meg megadjuk az értékeket, ahogy elöbb is!! 
        -> 
        between(field:string, values:[any, any], andOrWhere:string):SqlQueryBuilder {
            this.sql += `${andOrWhere} ${field} BETWEEN ?*** AND ?***}} `;
            this.values.push(...values);*******
            return this;
    }
    */
    
    public insert(table:string, fieldsValues:Record<string, any>):SqlQueryBuilder {
        this.sql += `INSERT INTO ${table} 
        (${Object.keys(fieldsValues)}) 
        VALUES(${getQuestionMarks(Object.keys(fieldsValues))})`

        this.values.push(...Object.values(fieldsValues));
        console.log(this.values);
        return this;
    }

    /*
        FieldsValues az egy objektum, aminek a kulcsai string-ek, az értékei meg lehetnek bármik (any)
        Kulcsok azok ilyenek lesznek, hogy isAdmin, email, pass, firstName, lastName 
        ->
        `INSERT INTO ${table} (${Object.keys(fieldsValues)})`
        és akkor a table után kellenek a kulcsok, mert így néz ki egy lekérdezés, hogy 
        INSERT INTO users (isAdmin, email, pass ...) VALUES(?,?,?...), [értékek]
        VALUES-nál megugyanúgy kell megcsinálni, ahogy csináltuk az in-nél, 
            és mivel ez többször elő fog fordulni, ezért kiszervezzük egy segédfüggvénybe -> ${values.map(v=>"?").join(",")}
        getQuestionMarks.ts
        -> 
        function getQuestionMarks(values:any[]):string {
            return values.map(v=>"?").join(",");
        }
        és itt ahol kell ott meg lehet hívni és adni neki egy values-t 
        ->
        public insert(table:string, fieldsValues:Record<string, any>) {
            this.sql += `INSERT INTO ${table} 
            (${Object.keys(fieldsValues)}) 
            VALUES(${getQuestionMarks(Object.keys(fieldsValues))})*******`
        Tehát annyi ? jel kell, amennyi kulcsa van fieldsValues tömbnek -> Object.keys(fieldsValues)
        De itt lehetett volna keys() helyett a values() is ugyanannyi ? csinál mindegyik 
        keys() a kulcsokat fogja egy ilyen string tömbbe belerakni és a values ugyanezt csinálja csak egy any tömbbe!! 

        this.values.push(...Object.values(fieldsValues));
        de itt már fontos, hogy fieldsValues-nak az értékeit adjuk meg!!!!! 

        Ez visszaad nekünk, ugyanúgy mint a többi egy SqlQueryBuilder-t 
        return this;

        index.ts-en megnézzük, hogy ez az insert() jó sql string-et csinál-e 
    */

    public join(joinType:joinTypes, table:string, fields:[string, string]):SqlQueryBuilder {
        this.sql += `${joinType} ${table} ON ${fields[0]} = ${fields[1]} `;
        return this;
    }

    /*
        joinType, hogy milyen join (left, right, inner), de ezt meg lehet csinálni a types.ts-ben (models) egy enum-ot, 
        hogy biztos, hogy ne írjuk el
        enum joinTypes {  
            INNER = "INNER JOIN",
            LEFT = "LEFT JOIN", 
            RIGHT = "RIGHT JOIN"
        Ezt ugyanúgy, mint a type-ot meg lehet adni, hogy milyen típusú legyen
        ->
        public join(joinType:joinTypes .. )
        Van egy table-t, amit majd összekapcsolunk és után jön, hogy ON, tehát hogy milyen mezőkkel van össezkötve a két tábla 
        Ez itt egy fields string tömb lesz (tuple), aminek két string eleme van  
        -> 
        public join(joinType:joinTypes, table:string, fields:[string, string]****)
        -> 
        public join(joinType:joinTypes, table:string, fields:[string, string]) {
            this.sql += `${joinType} ${table} ON ${fields[0]}*** = ${fields[1]}*** `;

        index.ts-en, hogy hogyan müködik 
        ->
        let sql3:string = qb.select("users", ["userID", "email"]).join(joinTypes.INNER, "ratings", ["users.userID", "ratings.userID"]).getSql();

        join(joinTypes.INNER)
        Nekünk ezt automatikusan be fogja helyetesíteni, arra, hogy INNER JOIN és nem lehet majd elírni
    */

    //JOIN-ból lehet alapból egy olyat csinálni, hogy INNER JOIN-os 
    public innerJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.INNER, table, fields);
    }
    //és ha az innerJoin-t hívjuk meg akkor nem kell beírni, hogy mi a joinType, mert abban meg van hívva a join és ott megadtuk neki!! 

    //ugyanígy lehet right és left join-os is 
    public leftJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.LEFT, table, fields);
    }

    public rightJoin(table:string, fields:[string, string]):SqlQueryBuilder {
        return this.join(joinTypes.RIGHT, table, fields);
    }
    

    

   
}

/*
    Amit itt fontos megérteni, pl. hogy mi az amikor visszaadunk egy this-t!!! 
    1. Tulajdonságok módosítása (két tulajdonságot módosít az adott példányban )
        this.sql -> hozzáfüzi a WHERE feltételt az SQL lekérdezés karakterlácához (de a select-nél mást pl. de itt most a where() legyen a példa)
        this.values -> hozzáadja a value értéket egy tömbhöz, amely később használható paraméterezett lekérdezésekhez
    2. this visszaadása !!! 
        A metódus végén a return this visszadha az aktuális példányt!!! azaz azt az objektumot, amelyen metódust hívták meg 
    3. Láncolható metósukot 
        Mivel a metódus visszaadja a this-t további metódushívásokat füzhetünk ugyanarra a példányra 
*/



export default SqlQueryBuilder;

/*
    A kapcsolatnak a visszatérési értéke void, de viszont egy aszinkron ezért Promise<void>
    ->
    public async getConnection():Promise<void> 

    select viszont nem lesz async, mert itt még nem hajtjuk végre a folyamatot és a visszatérési értéke SqlQueryBuilder lesz!!!!! 
    -> 
    public select():SqlQueryBuilder {

    Ez a select az vár egy table-t, hogy melyik táblából szeretnénk lekérdezni és egy values, hogy mi az értéke a rekord-nak amit megadunk 
        ennek a típusa Record<string, any>
    ->
    public select(table:string, values:Record<string, any>):SqlQueryBuilder {
    ****
    Record<string, any> 
        Egy TypeScript segédtípus, amely egy olyan objektumtípust hoz létre, ahol a kulcsok típusa string, míg az értékek bármilyen típusúak 
        lehetnek (any) 
        Ezt akkor csináljuk, hogyha szükségünk van egy objektumra, amely rugalmas kulcsokkal rendelkezik, de nem tudjuk pontosan, hogy az 
            értékek milyen típusúak lesznek (string, number, boolean, vagy akár beágyazott objektum is) 
*/
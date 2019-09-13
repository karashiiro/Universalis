# Universalis
A crowdsourced market board aggregator. Not even nearly completed, though contributions are welcome.

# Endpoint Reference
* /api/:world/:item
* /api/history/:world/:item
* /api/extra/content/:contentID
* /api/extra/stats/upload-history
* /api/extra/stats/recently-updated
* /upload/:apiKey

# Development
Requires [Node.js](https://nodejs.org/) v10 or higher, [PHP](https://www.php.net/downloads.php), [MariaDB](https://mariadb.org/download/), [Redis](https://redis.io/download), [Composer](https://getcomposer.org/), and [MongoDB Community Edition](https://docs.mongodb.com/manual/administration/install-community/) v4.2 or higher.

Uncomment/add in php.ini:
```
extension=redis.so
```

MariaDB commands:
```
CREATE DATABASE `dalamud`;
CREATE USER 'dalamud'@localhost IDENTIFIED BY 'dalamud';
```

Setup script:
```
npm install -g yarn
npm install
git submodule init
git submodule update
cd mogboard
git submodule init
git submodule update
composer install
php bin/console doctrine:schema:create
php bin/console PopulateGameDataCommand -vvv
yarn
yarn dev
symfony server:start -vvv --port 8000
cd ..
npm run build
npm start
```

# Uploads
Listings upload format (JSON):

```
{
    worldID: number;
    itemID: number;
    uploaderID: string | number;
    listings: [{
        listingID: string;
        hq: boolean;
        materia?: ItemMateria[];
        pricePerUnit: number;
        quantity: number;
        total?: number;
        retainerID: string;
        retainerName: string;
        retainerCity: number;
        creatorName?: string;
        onMannequin?: boolean;
        sellerID: string;
        creatorID?: string;
        lastReviewTime: number;
        stainID?: number;
    }];
}
```

History upload format (JSON):

```
{
    worldID: number;
    itemID: number;
    uploaderID: number | string;
    entries: [{
        hq: boolean;
        pricePerUnit: number;
        quantity: number;
        total?: number;
        buyerName: string;
        timestamp: number;
        onMannequin?: boolean;
        sellerID: string;
    }];
}
```

Crafter upload format (JSON):

```
{
    contentID: number;
    characterName: string;
}
```

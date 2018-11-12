var express = require('express');
var app = express();
var morgan = require('morgan');
var bodyParser = require('body-parser');
app.use(morgan('combined'));
var path = require('path');
var port = 8080;
app.use(bodyParser.json());
var mongo = require('mongodb')
var MongoClient = mongo.MongoClient;
var url = 'mongodb://localhost:27017/';
var pool;
MongoClient.connect(url, function (err, db) {
	if (err)
		throw err;
	console.log("BOM connected!");
	pool = db;
})

app.get('/category', function (req, res) {
	var dbo = pool.db('BOM')
	dbo.collection('category').distinct("cat_name", function (err, result) {
		if (err)
			throw err;
		res.send(JSON.stringify(result));	
	})
});

app.post('/getcategory', function (req, res) {
	var cat = req.body.cat;
	var dbo = pool.db('BOM')
	dbo.collection(cat).findOne({}, function (err, result) {
		if (err)
			throw err;
		res.send(JSON.stringify(result));	
	})
});

app.post('/specification', function(req, res) {
	var cat = req.body.cat;
	var spec = req.body.spec;
	var dbo = pool.db('BOM')
	dbo.collection(cat).distinct(spec, function (err, result) {
		if (err)
			throw err;
		res.send(JSON.stringify(result));	
	})
});

app.post('/getpartid', function (req, res) {
	var cat = req.body.cat;
	var desc = req.body.desc;
	var dbo = pool.db('BOM')
	dbo.collection(cat).findOne({"desc":desc}, function (err, result) {
		if (err)
			throw err;
		res.send(JSON.stringify(result));	
	})

});

app.post('/checkpartid', function (req, res) {
	var partid = req.body.partid;
	p_id= partid.split("x");
	var dbo = pool.db('BOM');
	dbo.collection("category").findOne({"cat_id":p_id[0]}, function (err, result) {
		if (err)
			throw err;
		if (result == null)
			res.send("0");
		else
		{
			dbo.collection(result.cat_name).findOne({"part_id":partid}, function (err, r) {
				if (err)
					throw err
				if (r == null)
					res.send("0");
				else
					res.send(JSON.stringify(r));
			})
		}
	})
});

app.post('/commitebomtodb', function (req, res) {
	list = req.body.list;
	ebomname = req.body.ebomname;
	var dbo = pool.db('BOM')
	dbo.createCollection("ebominfo", function (err, r) {
		if (err)
			throw err
		dbo.collection("ebominfo").findOne({"ebom_name":ebomname}, function (err, result) {
			if (err)
				throw err;
			if (result == null)
			{
				var myobj = {"ebom_name":ebomname, "eng_id": 1, "commit":  "1"};
				dbo.collection("ebominfo").insertOne(myobj, function (err, r1) {
					if (err)
						throw err;
					for (var i = 0; i < list.length; i++) {
						list[i].ebom_id = myobj._id;
					}	
					dbo.createCollection("ebom", function (err, r3) {
						if (err)
							throw err;
						dbo.collection("ebom").insertMany(list, function(err, r4) {
							if (err)
								throw err;
							res.send("Inserted EBOM into DB");
						})
					})
				})
			}	
			else
			{
				res.send("EBOM name already exists");
			}
		})
	})

});

app.post('/checkstock', function (req, res) {
	var x = req.body.x;
	var dbo = pool.db('BOM')
	dbo.collection("stock").find({}).toArray(function (err, result) {
		if (err)
			throw err;
		res.send(JSON.stringify(result));	
	})
});

app.post('/updatestock', function (req, res) {
	var partno = req.body.partno;
	var quantity = req.body.quantity;
	
	var dbo = pool.db('BOM')
	dbo.createCollection("stock", function (err, result) {
		if (err)
			throw err;
		dbo.collection("stock").findOne({"partno":partno}, function (err, r) {
			if (err)
				throw err;
			if (r == null)
			{
				dbo.collection("stock").insert({"partno":partno, "quantity": quantity}, function (err, r1) {
					if (err)
						throw err;
					res.send("Stock Updated");
				})
			}
			else
			{
				dbo.collection("stock").update({"partno": partno}, {"$set":{"quantity":quantity}}, {"multi": "false"}, function(err, r3){
					if (err)
						throw err;
					res.send("Stock Updated");
				})
			}
		})	
	})
})

app.post('/validate', function (req, res) {
	var ebomname = req.body.ebomname;	

	var dbo = pool.db('BOM')
	dbo.collection("ebominfo").findOne({"ebom_name" : ebomname}, function (err, result) {
		if (err)
			throw err;
		if (result == null) {
			res.send("0");
		}
		else
		{
			var ebomid = result._id;
			dbo.collection("ebom").find({"ebom_id": ebomid}).toArray(function (err, r) {
				if (err)
					throw err;
				res.send(JSON.stringify(r));
			});
		}
	})
});

app.get('/vebom/:ebomname',function(req,res){
	var ebomname = req.params.ebomname;
	var dbo = pool.db('BOM')
	var contents;
	dbo.collection("ebominfo").findOne({"ebom_name": ebomname} , function (err, result) {
		if (err)
			throw err;
		var ebomid = result._id;
		dbo.collection("ebom").find({"ebom_id": ebomid}).toArray(function (err, r) {
			if (err)
				throw err;
			contents =`
					<head><title>BOM Management</title></head>

					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<!-- Latest compiled and minified CSS -->
					<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">

					<!-- jQuery library -->
					<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>

					<!-- Latest compiled JavaScript -->
					<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
					<style type="text/css">
						thead {
							background-color: grey;
						}
						tbody tr:hover {
							background-color: lightgrey;
							cursor: pointer;
						}
					</style>
					</head>
					<body>
					<table class="table table-bordered">
					<thead>
						<tr>
							<th>Sl no.</th>
							<th>Part No.</th>
							<th>Part Description</th>
							<th>Qty</th>
							<th>Req</th>
							<th>Price (Rs.)</th>
							<th>Comments</th>
						</tr>
					</thead>
					<tbody id="tbody1">	
					`;
			for (i = 0; i < r.length; i++){
				var rid = "r" + (i).toString();
				var cid = "c" + (i).toString();
				var modified_comments = r[i].comments;
				modified_comments = modified_comments.replace(/\n/g, "<br />");
				var tr = `<tr ondblclick="editattr(${i})" id="${rid}">
						<td>${i+1}</td>
						<td>${r[i].partno}</td>
						<td>${r[i].partdesc}</td>
						<td>${r[i].qty}</td>
						<td>${r[i].req}</td>
						<td>${r[i].price}</td>
						<td>${modified_comments}</td>
						</tr>`;
				contents += tr;
			}
			contents+=`</tbody>
					</table>
					</body>
					</html>`
			res.send(contents);
		});
	});
})

app.get('/engineer/enghome', function (req, res) {
	res.sendFile(path.join(__dirname, 'ui', 'enghome.html'));
});

app.get('/engineer/enghome/ebomcr', function (req, res) {
	res.sendFile(path.join(__dirname, 'ui', 'ebomcr.html'));
});

app.get('/manufacturer/manhome', function(req,res) {
	res.sendFile(path.join(__dirname, "ui", "manhome.html"));
})

app.get('/manufacturer/manhome/manupdate', function(req,res) {
	res.sendFile(path.join(__dirname, "ui", "manupdate.html"));
})

app.get('/manufacturer/manhome/mbomcr', function(req,res) {
	res.sendFile(path.join(__dirname, "ui", "mbomcr.html"));
})

app.listen(port);
console.log("Project running on localhost:8080")
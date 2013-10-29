var server = "http://127.0.0.1:8080/";//"http://25.9.84.47:8080/";//http://hyperdvba:8080/";
var masizos = "masizos",
	parcelas = "parcelas";//"primaria";
var workspace = "Vialidad";//"dvba";

var Nomenclatura = new Class({ 
	Implements: Events,
	win: false,
	dom: false,
	ext: false,
	initialize: function(ext){
		this.ext = ext;
		this.dom = $('nomenclatura');
		this.clickEnMapa();
		this.dom.getElement('button').addEvent('click',this.consultar.bind(this));
		window.callbackNomenclatura = this.procesarRespuesta.bind(this);
		this.capa = new OpenLayers.Layer.Vector("Consulta Progresiva", {
			group: "vialidad"
		});
	},
	mostrar: function(){
		var self = this;
		if(!this.win){
			this.win = new Ext.Window({
				title		: 'Busqueda por Nomenclatura',
				width		: 150,
				height		: 360,
				closeAction	: 'hide',
				contentEl	: this.dom,
				autoScroll	: true,
				onHide: function(){
					self.clickControl.deactivate();
					app.mapPanel.map.removeLayer(self.capa);
				},
				onShow: function(){
					self.clickControl.activate();
					app.mapPanel.map.addLayer(self.capa);
				}
			});
		}
		app.mapPanel.map.addLayer(this.capa);
		this.win.show(this.ext);
	},
	clickEnMapa: function(){
		var self = this;
		ClickControl = OpenLayers.Class(OpenLayers.Control, {                
            defaultHandlerOptions: {
                'single': true,
                'double': false,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': false
            },

            initialize: function(options) {
                this.handlerOptions = OpenLayers.Util.extend(
                    {}, this.defaultHandlerOptions
                );
                OpenLayers.Control.prototype.initialize.apply(
                    this, arguments
                ); 
                this.handler = new OpenLayers.Handler.Click(
                    this, {
                        'click': this.trigger
                    }, this.handlerOptions
                );
            }, 

            trigger: function(e) {
            	var resultadoDom = self.dom.getElement('#resultadoP')
				resultadoDom.empty();
                var lonlat = app.mapPanel.map.getLonLatFromPixel(e.xy);
                var point = new OpenLayers.Geometry.Point(lonlat.lon,lonlat.lat);
                if(self.bufferVec){
					self.capa.removeFeatures([self.bufferVec]);
					self.bufferVec = false;
                }
                var bufferValue = 50;
                self.buffer = new OpenLayers.Geometry.Polygon.createRegularPolygon(point,bufferValue,20);
				
				self.bufferVec = new OpenLayers.Feature.Vector(self.buffer);
				self.capa.addFeatures([self.bufferVec]);
                
                var bounds = self.buffer.getBounds().toArray();
                self.win.disable();
				var myJSONP = new Request.JSONP({
					url: server+'geoserver/'+workspace+'/wfs',
					data: {
						service: 'WFS',
						version: '1.0.0',
						request: 'GetFeature',
						typeName: capa,
						maxFeatures: '100',
						srsName: app.mapPanel.map.getProjection(),
						outputFormat: 'text/javascript',
						format_options: 'callback:callbackProgresiva',
						filter: "<Filter><BBOX><PropertyName>the_geom</PropertyName><Box srsName='EPSG:900913'><coordinates>"+bounds[0]+","+bounds[1]+" "+bounds[2]+","+bounds[3]+"</coordinates></Box></BBOX></Filter>"
					},
				}).send();
            }

        });
		this.clickControl = new ClickControl();
		app.mapPanel.map.addControl(this.clickControl);
		//this.clickControl.deactivate();
	},
	completar: function(palabra,largo){
		while(palabra.length < largo){
			palabra = "0"+palabra;
		}
		return palabra.toUpperCase();
	},
	_gTex: function(id){
		var dom = this.dom.getElement(id);
		var respuesta = {
			seteado: true
		};
		if(dom.getAttribute('tipo') == "numero"){
			if(dom.value.toInt() == 0){
				respuesta.seteado = false;
			}
		}else{
			if(dom.value.trim().length == 0){
				respuesta.seteado = false;
			}
		}
		respuesta.valor = this.completar(dom.value,dom.getAttribute('largo').toInt());
		return respuesta;
	},
	gTex: function(ids){
		var respuesta = {
			seteado: false,
			valor: ""
		};
		for (var i = ids.length - 1; i >= 0; i--) {
			var valor = this._gTex(ids[i]);
			if(valor.seteado)
				respuesta.seteado = true;
			respuesta.valor += valor.valor;
		};
		return respuesta;
	},
	consultar: function(){
		var nomenclatura = {
			partido: this.gTex(['#partidoN']),
			circunscripcion: this.gTex(['#circunscripcionN']),
			seccion: this.gTex(['#seccionN']),
			chacra: this.gTex(['#chacraNN','#chacraTN']),
			quinta: this.gTex(['#quintaNN','#quintaTN']),
			fraccion: this.gTex(['#fraccionNN','#fraccionTN']),
			manzana: this.gTex(['#manzanaNN','#manzanaTN']),
			parcela: this.gTex(['#parcelaNN','#parcelaTN'])
		};

		var capa,nomencla;

		if(nomenclatura.partido.seteado){//Tiene Partido?
			if(nomenclatura.circunscripcion.seteado){//Tiene Circunscripcion?
				if(nomenclatura.seccion.seteado){//Tiene Seccion?
					if(	nomenclatura.chacra.seteado || 
						nomenclatura.quinta.seteado || 
						nomenclatura.fraccion.seteado ||
						nomenclatura.manzana.seteado){
						if(nomenclatura.parcela.seteado){
							capa = "parcela";
							this.nomenclatura = 
								nomenclatura.partido.valor+
								nomenclatura.circunscripcion.valor+
								nomenclatura.seccion.valor+
								nomenclatura.chacra.valor+
								nomenclatura.quinta.valor+
								nomenclatura.fraccion.valor+
								nomenclatura.manzana.valor+
								nomenclatura.parcela.valor;
						}else{
							capa = "macizo";
							this.nomenclatura = 
								nomenclatura.partido.valor+
								nomenclatura.circunscripcion.valor+
								nomenclatura.seccion.valor+
								nomenclatura.chacra.valor+
								nomenclatura.quinta.valor+
								nomenclatura.fraccion.valor+
								nomenclatura.manzana.valor;
						}
					}else{
						capa = "seccion";
						this.nomenclatura = nomenclatura.partido.valor+
											nomenclatura.circunscripcion.valor+
											nomenclatura.seccion.valor;
					}
				}else{
					capa = "circunscripcion";
					this.nomenclatura = nomenclatura.partido.valor+nomenclatura.circunscripcion.valor;
				}
			}else{
				capa = "partido";
				this.nomenclatura = nomenclatura.partido.valor;
			}
		}else{
			Ext.MessageBox.alert('Error', 'Debe definir almenos el partido.');
			return false;
		}
		console.log(capa,this.nomenclatura);
		return;
		this.win.disable();
		var myJSONP = new Request.JSONP({
			url: server+'geoserver/'+workspace+'/wfs',
			data: {
				service: 'WFS',
				version: '1.0.0',
				request: 'GetFeature',
				typeName: capa,
				maxFeatures: '100',
				srsName: app.mapPanel.map.getProjection(),
				outputFormat: 'text/javascript',
				format_options: 'callback:callbackNomenclatura',
				filter: '<And>  <PropertyIsEqualTo>    <PropertyName>nomencla</PropertyName>    <Literal>'+this.nomenclatura+'</Literal>  </PropertyIsEqualTo>  <PropertyIsGreaterThanOrEqualTo>   <PropertyName>PK_FINAL</PropertyName>   <Literal>'+this.kilometro+'</Literal>  </PropertyIsGreaterThanOrEqualTo>  <PropertyIsLessThanOrEqualTo>   <PropertyName>PK_INIC</PropertyName>   <Literal>'+this.kilometro+'</Literal>  </PropertyIsLessThanOrEqualTo> </And>'
			},
		}).send();
	},
	procesarRespuesta: function(response){
		var respuesta = response;
		var self = this;
		console.log('Respuesta',respuesta);
		var resultadoDom = this.dom.getElement('#resultadoP')
		resultadoDom.empty();
		if(respuesta.features.length == 0){
			Ext.MessageBox.alert('Error', 'No se pudo encontrar la progresiva, los datos son erroneos.');
		}else{
			respuesta.features.each(function(item){
				var feature = item;
				// var mapa = [];
				// for(i in feature.properties){
				// 	if(typeof feature.properties[i] == 'function')
				// 		continue;
				// 	mapa.push([i,feature.properties[i]]);
				// }
				// var resultado = new HtmlTable({
				// 	properties: {
				// 		border: 1,
				// 		cellspacing: 0
				// 	},
				// 	headers: ['Propiedad', 'Valor'],
				// 	rows: mapa,
				// 	zebra: true
				// });
				var punto,
					lineString = [];
				for (i in feature.geometry.coordinates[0]){
					punto = feature.geometry.coordinates[0][i];
					if(typeof punto == 'function') continue;
					punto = new OpenLayers.Geometry.Point(punto[0],punto[1]);
					lineString.push(punto);
				}

				var geometria = new OpenLayers.Geometry.LineString(lineString);

				//Calculo la el punto de la progresiva dentro del tramo
				//PK_INIC,PK_FINAL
				//console.log(feature.properties.PK_INIC, feature.properties.PK_FINAL, ' = ', feature.properties.PK_FINAL - feature.properties.PK_INIC);
				var porcentaje = ((parseFloat(self.kilometro)-feature.properties.PK_INIC))/(feature.properties.PK_FINAL-feature.properties.PK_INIC);
				console.log(porcentaje);
				var vertices = geometria.getVertices();
				var suma = 0;
				vertices.each(function(point,i){
					if(i==vertices.length-1) return;
					//console.log(point.distanceTo(vertices[i+1]));
					if(self.buffer){
						var partecita = new OpenLayers.Geometry.LineString([vertices[i],vertices[i+1]]);
						if(self.buffer.intersects(partecita)){
							sumaBuffer = suma + point.distanceTo(self.buffer.getCentroid());
						}
					}
					suma += point.distanceTo(vertices[i+1]);
				})
				if(self.buffer){
					self.buffer = false;
					var porcentaje = ((sumaBuffer / suma)>1)?1:(sumaBuffer / suma);
					self.dom.getElement('#kilomentroP').value = Math.round((feature.properties.PK_INIC + (feature.properties.PK_FINAL - feature.properties.PK_INIC) * porcentaje)*1000)/1000;
					self.dom.getElement('#rutaP').value = feature.properties.RUTA;
				}
				
				var porcentajeEnSuma = suma * porcentaje;
				
				var listo = false;
				vertices.each(function(point,i){
					if(listo) return;
					if(i==vertices.length-1) return;
					//console.log(point.distanceTo(vertices[i+1]));
					if(porcentajeEnSuma - point.distanceTo(vertices[i+1]) < 0){
						listo = true;
						var porcentajeTramo = porcentajeEnSuma/point.distanceTo(vertices[i+1]);
						var distanciaProximo = point.distanceTo(vertices[i+1],{details:true});
						if(self.puntoFeature){
							self.capa.removeFeatures([self.puntoFeature]);
							self.puntoFeature = false;
		                }
						self.puntoConsulta = point.clone();
						self.puntoConsulta.x = distanciaProximo.x0+(distanciaProximo.x1-distanciaProximo.x0)*porcentajeTramo;
						self.puntoConsulta.y = distanciaProximo.y0+(distanciaProximo.y1-distanciaProximo.y0)*porcentajeTramo;
						self.puntoFeature = new OpenLayers.Feature.Vector(self.puntoConsulta);
						self.capa.addFeatures([self.puntoFeature]);
					}else{
						porcentajeEnSuma -= point.distanceTo(vertices[i+1]);
					}
				})

				if(self.vectorFeature){
					self.capa.removeFeatures([self.vectorFeature]);
					self.vectorFeature = false;
                }
				self.vectorFeature = new OpenLayers.Feature.Vector(geometria);
				self.capa.addFeatures([self.vectorFeature]);
				self.win.enable();
				app.mapPanel.map.setCenter([self.puntoConsulta.x,self.puntoConsulta.y],15);
				// var boton = new Element('button',{
				// 	text: 'Ver en mapa'
				// });
				// boton.addEvent('click',function(){
				// 	app.mapPanel.map.zoomToExtent(geometria.getBounds());
				// })
				
				// boton.inject(resultadoDom);
				// resultado.inject(resultadoDom);
			})
		}
	}
});
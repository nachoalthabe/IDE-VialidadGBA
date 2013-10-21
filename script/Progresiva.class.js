var server = "http://25.9.84.47:8080/";//http://hyperdvba:8080/";
var capa = "red_vial_22185";//"primaria";
var workspace = "Vialidad";//"dvba";
var Progresiva = new Class({ 
	Implements: Events,
	win: false,
	dom: false,
	ext: false,
	initialize: function(ext){
		this.ext = ext;
		this.dom = $('progresiva');
		this.clickEnMapa();
		this.dom.getElement('button').addEvent('click',this.consultar.bind(this));
		window.callbackProgresiva = this.procesarRespuesta.bind(this);
		this.capa = new OpenLayers.Layer.Vector("Consulta Progresiva", {});
	},
	mostrar: function(){
		var self = this;
		if(!this.win){
			this.win = new Ext.Window({
				title		: 'Calcular Progresiva',
				width		: 400,
				height		: 300,
				closeAction	: 'hide',
				contentEl	: this.dom,
				autoScroll	: true,
				onHide: function(){
					self.clickControl.deactivate();
					app.mapPanel.map.removeLayer(this.capa);
				},
				onShow: function(){
					self.clickControl.activate();
				}
			});
		}
		app.mapPanel.map.addLayer(this.capa);
		this.win.show(this.ext);
	},
	clickEnMapa: function(){
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
                var lonlat = app.mapPanel.map.getLonLatFromPixel(e.xy);
                var point = new OpenLayers.Geometry.Point(lonlat.lon,lonlat.lat);
                
                var buffer = new OpenLayers.Geometry.Polygon.createRegularPolygon(point,10,20);
                var bounds = buffer.getBounds();
                
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
						cql_filter: 'INTERSECTS(the_geom,'+buffer.transform(app.mapPanel.map.getProjection(),'EPSG:22185').toString()+')'
					},
				}).send();
            }

        });
		this.clickControl = new ClickControl();
		app.mapPanel.map.addControl(this.clickControl);
		//this.clickControl.deactivate();
	},
	consultar: function(){
		this.kilometro = this.dom.getElement('#kilomentroP').value;
		this.ruta = this.dom.getElement('#rutaP').value.trim();
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
				filter: '<And>  <PropertyIsEqualTo>    <PropertyName>RUTA</PropertyName>    <Literal>'+this.ruta+'</Literal>  </PropertyIsEqualTo>  <PropertyIsGreaterThanOrEqualTo>   <PropertyName>PK_FINAL</PropertyName>   <Literal>'+this.kilometro+'</Literal>  </PropertyIsGreaterThanOrEqualTo>  <PropertyIsLessThanOrEqualTo>   <PropertyName>PK_INIC</PropertyName>   <Literal>'+this.kilometro+'</Literal>  </PropertyIsLessThanOrEqualTo> </And>'
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
			resultadoDom.set('text','Sin resultados');
		}else{
			respuesta.features.each(function(item){
				var feature = item;
				var mapa = [];
				for(i in feature.properties){
					if(typeof feature.properties[i] == 'function')
						continue;
					mapa.push([i,feature.properties[i]]);
				}
				var resultado = new HtmlTable({
					properties: {
						border: 1,
						cellspacing: 0
					},
					headers: ['Propiedad', 'Valor'],
					rows: mapa,
					zebra: true
				});
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
					suma += point.distanceTo(vertices[i+1]);
				})
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
						self.puntoConsulta = point.clone();
						self.puntoConsulta.x = distanciaProximo.x0+(distanciaProximo.x1-distanciaProximo.x0)*porcentajeTramo;
						self.puntoConsulta.y = distanciaProximo.y0+(distanciaProximo.y1-distanciaProximo.y0)*porcentajeTramo;
						self.puntoFeature = new OpenLayers.Feature.Vector(self.puntoConsulta);
						self.capa.addFeatures([self.puntoFeature]);
						console.log(porcentajeTramo);
					}else{
						porcentajeEnSuma -= point.distanceTo(vertices[i+1]);
					}
				})

				var boton = new Element('button',{
					text: 'Ver en mapa'
				});
				boton.addEvent('click',function(){
					app.mapPanel.map.zoomToExtent(geometria.getBounds());
				})
				
				boton.inject(resultadoDom);
				resultado.inject(resultadoDom);
			})
		}
	}
});
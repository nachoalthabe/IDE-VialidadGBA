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
				},
				onShow: function(){
					self.clickControl.activate();
				}
			});
		}
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
					url: 'http://127.0.0.1:8080/geoserver/Vialidad/wfs',
					data: {
						service: 'WFS',
						version: '1.0.0',
						request: 'GetFeature',
						typeName: 'Vialidad:red_vial_22185',
						maxFeatures: '100',
						srsName: app.mapPanel.map.getProjection(),
						outputFormat: 'text/javascript',
						format_options: 'callback:callbackProgresiva',
						cql_filter: 'INTERSECT(geom,'+buffer.toString()+')'
					},
				}).send();
            }

        });
		this.clickControl = new ClickControl();
		app.mapPanel.map.addControl(this.clickControl);
		//this.clickControl.deactivate();
	},
	consultar: function(){
		var kilometro = this.dom.getElement('#kilomentroP').value;
		var myJSONP = new Request.JSONP({
			url: 'http://127.0.0.1:8080/geoserver/Vialidad/wfs',
			data: {
				service: 'WFS',
				version: '1.0.0',
				request: 'GetFeature',
				typeName: 'Vialidad:red_vial_22185',
				maxFeatures: '100',
				srsName: app.mapPanel.map.getProjection(),
				outputFormat: 'text/javascript',
				format_options: 'callback:callbackProgresiva',
				filter: '<And>  <PropertyIsEqualTo>    <PropertyName>RPRUTA</PropertyName>    <Literal>RP 1</Literal>  </PropertyIsEqualTo>  <PropertyIsGreaterThanOrEqualTo>   <PropertyName>PK_FINAL</PropertyName>   <Literal>'+kilometro+'</Literal>  </PropertyIsGreaterThanOrEqualTo>  <PropertyIsLessThanOrEqualTo>   <PropertyName>PK_INIC</PropertyName>   <Literal>'+kilometro+'</Literal>  </PropertyIsLessThanOrEqualTo> </And>'
			},
		}).send();
	},
	procesarRespuesta: function(response){
		console.log('Respuesta',response);
		var resultadoDom = this.dom.getElement('#resultadoP')
		resultadoDom.empty();
		if(response.features.length == 0){
			resultadoDom.set('text','Sin resultados');
		}else{
			response.features.each(function(item){
				var mapa = [];
				for(i in item.properties){
					if(typeof item.properties[i] == 'function')
						continue;
					mapa.push([i,item.properties[i]]);
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
				for (i in item.geometry.coordinates[0]){
					punto = item.geometry.coordinates[0][i];
					if(typeof punto == 'function') continue;
					punto = new OpenLayers.Geometry.Point(punto[0],punto[1]);
					lineString.push(punto);
				}
				
				var geometria = new OpenLayers.Geometry.LineString(lineString);
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
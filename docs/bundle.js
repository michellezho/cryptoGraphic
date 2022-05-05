(function (d3$1) {
  'use strict';

  /*-------------------------------------------
  	Define the data sources 
  --------------------------------------------*/

  const jsonData = us_states_json;
  const csvPath = 'states_infected.csv';
   
  /*-------------------------------------------
  	Select the SVG (serves as the 'canvas')
  --------------------------------------------*/

  // Select the svg
  const svg = d3$1.select('svg');

  const svgProps = {
   	width: +svg.attr('width'),
    height: +svg.attr('height')
  };

  /*-------------------------------------------
  	Generate the state paths
  --------------------------------------------*/

  // Define the D3 Albers Projection
  const albersProjection = d3.geoAlbersUsa()
  	.scale(1000)
  	.translate([svgProps.width/2, svgProps.height/2]);


  // Define path generator, which converts the GeoJSON to SVG paths
  var geoPath = d3.geoPath()
  		// Apply the abersUsa projection
      .projection( albersProjection ); 

  /*-------------------------------------------
  	Define the color and text ranges
  --------------------------------------------*/

  // Define the linear scale for color output
  const legendColorRange = ['rgb(231,204,209)','rgb(171,77,94)','rgb(102,8,26)','rgb(82,0,16)', 'rgb(66,0,13)'];
  const colorScale = d3.scaleLinear()
      .domain([10, 100, 1000, 2000, 3000])
      .range(legendColorRange);



  /*-------------------------------------------
  	Methods to handle the data
  --------------------------------------------*/

  // Initialize variable to store the extent (min, max amount) of cases
  let extentCases;

  /* Load the data and update the JSON with its data values */
  function loadData(pathUrl) {
      var defer = $.Deferred();
      d3.csv(pathUrl, function(error, data) {
        
        	// Reject if error
          if (error) { defer.reject(error); }
        
    			// Get the extent (i.e min, max) amount of cases
          extentCases = d3.extent(data, function (d) { 
            return parseInt(d.cases); 
          });   
        
        	// Traverse through the csv data
         	for (let d of data) {
            let dataState = d.state;
            let dataValue = d.cases;

            // Find corresponding state in the GeoJSON
            for (let f of jsonData.features) {
              let jsonState = f.properties.name;
              if (dataState == jsonState) {
                f.properties.cases = dataValue; // Copy data value into the JSON
                break; // Stop looking through the JSON
              }
            }
          }
        	defer.resolve(jsonData.features);
      });
      return defer.promise();
  }

  /* Apply the data to visualize the concentration of cases per state */
  function applyStateData(stateSelection, textSelection) {
    
    // Fill each state in with appropriate color
    stateSelection.style('fill', function(d) {
      let value = d.properties.cases;
      return value? colorScale(value) : '#DFDFDF';
    });

   	// Display # cases for each state and position it to center of state
    textSelection
      .text(function(d) { return d.properties.cases; })
      .attr('transform', function(d) {
         let centroid = [geoPath.centroid(d)[0]-16, geoPath.centroid(d)[1]+4];
         return 'translate(' + centroid + ')';
       });
  } 

  /*-------------------------------------------
  	Create the needed elements
  --------------------------------------------*/

  /* Append the group element to the svg */
  const map = svg.append( 'g');

  /* Initiate the state groups (and perform data join)  */
  const stateGroup = svg.selectAll('g')
  	.data(jsonData.features);


  /* Define the "Enter" selection for each state group. */
  const stateEnter = stateGroup
    .enter().append('g')
  	// Toggle whether it is selected 
  	.on('click', function(d) {
      let classList = this.classList;
    	let isSelected = classList.contains("selected");
      isSelected? classList.remove("selected") : classList.add("selected");
    })
    .attr('class', 'state-container');


  /* Append title (i.e the state name) to each state group */
  stateEnter.append('title')
      .attr('class', 'name-text')
      .text(function(d) {
        return d.properties.name;
      });

  /* Append the path corresponding to each state */
  const stateSelection = stateEnter.append( 'path' )
      .attr('class', 'us-state')
      .attr( 'd', geoPath );

  /* Append the text (to display data) corresponding to each state */
  const textSelection = stateEnter.append( 'text')
  	.merge(stateGroup.select('text'))
      .attr('class', 'cases-text');


  /*-------------------------------------------
  	Ensure data load prior to visualizing it
  --------------------------------------------*/

  $.when(
      loadData(csvPath)
  ).done(function (res) {
    	applyStateData(stateSelection, textSelection);
    	createLegend();
  }).fail(function (err) {
      console.log(err);
  });


  /*-------------------------------------------
  	Create the legend
  --------------------------------------------*/

  const legendProps = {
    width: '1em',
    height: '20em',
    yAxisLabel: 'Number of Cases'
  };

  function createLegend() {
    
    // Append a defs (for definition) element to the SVG
    const defs = svg.append('defs');

    // Append linearGradient element to the defs
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'linearGradient')
      // Define vertical gradient
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    
    // Append multiple color stops by using D3's data/enter step
  	linearGradient.selectAll('stop')
      .data( colorScale.range() )
      .enter().append('stop')
      .attr('offset', function(d,i) { 
  			 return i/(colorScale.range().length-1);
  		})
      .attr('stop-color', function(d) { return d; });

    // Generage the legend, and fill it with the gradient
    const legend = svg.append('rect')
      .attr('id', 'legend')
      .attr('width', legendProps.width)
          .attr('height', legendProps.height)
          .style('fill', 'url(#linearGradient)');
    
    // Set the range for the y-axis and append it
  	const y = d3.scaleLinear().range([legendProps.height, 0]);
    y.domain(colorScale.domain());

    // Text label for the y-axis
    svg.append('text')
    		.attr('class', 'legend-cases-label')
    		.attr('transform', 'rotate(-90)')
        .style('text-anchor', 'middle')
      	.attr('dx', '-9em')
    		.attr('dy', '1em')
        .text(legendProps.yAxisLabel);      
    
    // Create the yScale
    const yScale = d3.scaleBand()
    	.domain(colorScale.domain()) // Set range of cases
    	.range([0, legendProps.height]) // Arranges from top to bottom
    	.padding(1);
      
    // Set y-axis and apply tick format and size
    const yAxis = d3.axisLeft(yScale)
    	.tickSize(-legendProps.width/2);
    
    // Append the y-axis 
    const yTicks = svg.append('g').call(d3.axisLeft(y))
      .attr('class', 'legend-cases-ticks')
    	.attr('fill', 'black')
    	.call(yAxis) 
        .selectAll('.domain')  // Select the domain and remove it
          .remove();
    
   

    

    
  }

}(d3));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBcbnsgc2VsZWN0LCBcbiAgZ2VvQWxiZXJzVXNhLFxuICBzY2FsZUxpbmVhcixcbiBcdHNjYWxlQmFuZCxcbiAgZXh0ZW50LFxuICBheGlzTGVmdCxcblx0Y3N2XG59IGZyb20gJ2QzJztcblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdERlZmluZSB0aGUgZGF0YSBzb3VyY2VzIFxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5jb25zdCBqc29uRGF0YSA9IHVzX3N0YXRlc19qc29uO1xuY29uc3QgY3N2UGF0aCA9ICdzdGF0ZXNfaW5mZWN0ZWQuY3N2JztcbiBcbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRTZWxlY3QgdGhlIFNWRyAoc2VydmVzIGFzIHRoZSAnY2FudmFzJylcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLy8gU2VsZWN0IHRoZSBzdmdcbmNvbnN0IHN2ZyA9IHNlbGVjdCgnc3ZnJyk7XG5cbmNvbnN0IHN2Z1Byb3BzID0ge1xuIFx0d2lkdGg6ICtzdmcuYXR0cignd2lkdGgnKSxcbiAgaGVpZ2h0OiArc3ZnLmF0dHIoJ2hlaWdodCcpXG59XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRHZW5lcmF0ZSB0aGUgc3RhdGUgcGF0aHNcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLy8gRGVmaW5lIHRoZSBEMyBBbGJlcnMgUHJvamVjdGlvblxuY29uc3QgYWxiZXJzUHJvamVjdGlvbiA9IGQzLmdlb0FsYmVyc1VzYSgpXG5cdC5zY2FsZSgxMDAwKVxuXHQudHJhbnNsYXRlKFtzdmdQcm9wcy53aWR0aC8yLCBzdmdQcm9wcy5oZWlnaHQvMl0pO1xuXG5cbi8vIERlZmluZSBwYXRoIGdlbmVyYXRvciwgd2hpY2ggY29udmVydHMgdGhlIEdlb0pTT04gdG8gU1ZHIHBhdGhzXG52YXIgZ2VvUGF0aCA9IGQzLmdlb1BhdGgoKVxuXHRcdC8vIEFwcGx5IHRoZSBhYmVyc1VzYSBwcm9qZWN0aW9uXG4gICAgLnByb2plY3Rpb24oIGFsYmVyc1Byb2plY3Rpb24gKTsgXG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHREZWZpbmUgdGhlIGNvbG9yIGFuZCB0ZXh0IHJhbmdlc1xuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vLyBEZWZpbmUgdGhlIGxpbmVhciBzY2FsZSBmb3IgY29sb3Igb3V0cHV0XG5jb25zdCBsZWdlbmRDb2xvclJhbmdlID0gWydyZ2IoMjMxLDIwNCwyMDkpJywncmdiKDE3MSw3Nyw5NCknLCdyZ2IoMTAyLDgsMjYpJywncmdiKDgyLDAsMTYpJywgJ3JnYig2NiwwLDEzKSddO1xuY29uc3QgbGVnZW5kVGV4dFJhbmdlID0gWycxLTEwJywgJzExLTEwMCcsICcxMDEtMSwwMDAnLCAnMSwwMDEtMywwMDAnLCAnMywwMDArJ107XG5jb25zdCBjb2xvclNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKVxuICAgIC5kb21haW4oWzEwLCAxMDAsIDEwMDAsIDIwMDAsIDMwMDBdKVxuICAgIC5yYW5nZShsZWdlbmRDb2xvclJhbmdlKTtcblxuXG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRNZXRob2RzIHRvIGhhbmRsZSB0aGUgZGF0YVxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vLyBJbml0aWFsaXplIHZhcmlhYmxlIHRvIHN0b3JlIHRoZSBleHRlbnQgKG1pbiwgbWF4IGFtb3VudCkgb2YgY2FzZXNcbmxldCBleHRlbnRDYXNlcztcblxuLyogTG9hZCB0aGUgZGF0YSBhbmQgdXBkYXRlIHRoZSBKU09OIHdpdGggaXRzIGRhdGEgdmFsdWVzICovXG5mdW5jdGlvbiBsb2FkRGF0YShwYXRoVXJsKSB7XG4gICAgdmFyIGRlZmVyID0gJC5EZWZlcnJlZCgpO1xuICAgIGQzLmNzdihwYXRoVXJsLCBmdW5jdGlvbihlcnJvciwgZGF0YSkge1xuICAgICAgXG4gICAgICBcdC8vIFJlamVjdCBpZiBlcnJvclxuICAgICAgICBpZiAoZXJyb3IpIHsgZGVmZXIucmVqZWN0KGVycm9yKTsgfVxuICAgICAgXG4gIFx0XHRcdC8vIEdldCB0aGUgZXh0ZW50IChpLmUgbWluLCBtYXgpIGFtb3VudCBvZiBjYXNlc1xuICAgICAgICBleHRlbnRDYXNlcyA9IGQzLmV4dGVudChkYXRhLCBmdW5jdGlvbiAoZCkgeyBcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoZC5jYXNlcyk7IFxuICAgICAgICB9KTsgICBcbiAgICAgIFxuICAgICAgXHQvLyBUcmF2ZXJzZSB0aHJvdWdoIHRoZSBjc3YgZGF0YVxuICAgICAgIFx0Zm9yIChsZXQgZCBvZiBkYXRhKSB7XG4gICAgICAgICAgbGV0IGRhdGFTdGF0ZSA9IGQuc3RhdGU7XG4gICAgICAgICAgbGV0IGRhdGFWYWx1ZSA9IGQuY2FzZXM7XG5cbiAgICAgICAgICAvLyBGaW5kIGNvcnJlc3BvbmRpbmcgc3RhdGUgaW4gdGhlIEdlb0pTT05cbiAgICAgICAgICBmb3IgKGxldCBmIG9mIGpzb25EYXRhLmZlYXR1cmVzKSB7XG4gICAgICAgICAgICBsZXQganNvblN0YXRlID0gZi5wcm9wZXJ0aWVzLm5hbWU7XG4gICAgICAgICAgICBpZiAoZGF0YVN0YXRlID09IGpzb25TdGF0ZSkge1xuICAgICAgICAgICAgICBmLnByb3BlcnRpZXMuY2FzZXMgPSBkYXRhVmFsdWU7IC8vIENvcHkgZGF0YSB2YWx1ZSBpbnRvIHRoZSBKU09OXG4gICAgICAgICAgICAgIGJyZWFrOyAvLyBTdG9wIGxvb2tpbmcgdGhyb3VnaCB0aGUgSlNPTlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXHRkZWZlci5yZXNvbHZlKGpzb25EYXRhLmZlYXR1cmVzKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXIucHJvbWlzZSgpO1xufTtcblxuXG4vKiBBcHBseSB0aGUgZGF0YSB0byB2aXN1YWxpemUgdGhlIGNvbmNlbnRyYXRpb24gb2YgY2FzZXMgcGVyIHN0YXRlICovXG5mdW5jdGlvbiBhcHBseVN0YXRlRGF0YShzdGF0ZVNlbGVjdGlvbiwgdGV4dFNlbGVjdGlvbikge1xuICBcbiAgLy8gRmlsbCBlYWNoIHN0YXRlIGluIHdpdGggYXBwcm9wcmlhdGUgY29sb3JcbiAgc3RhdGVTZWxlY3Rpb24uc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkKSB7XG4gICAgbGV0IHZhbHVlID0gZC5wcm9wZXJ0aWVzLmNhc2VzO1xuICAgIHJldHVybiB2YWx1ZT8gY29sb3JTY2FsZSh2YWx1ZSkgOiAnI0RGREZERic7XG4gIH0pO1xuXG4gXHQvLyBEaXNwbGF5ICMgY2FzZXMgZm9yIGVhY2ggc3RhdGUgYW5kIHBvc2l0aW9uIGl0IHRvIGNlbnRlciBvZiBzdGF0ZVxuICB0ZXh0U2VsZWN0aW9uXG4gICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wcm9wZXJ0aWVzLmNhc2VzOyB9KVxuICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgbGV0IGNlbnRyb2lkID0gW2dlb1BhdGguY2VudHJvaWQoZClbMF0tMTYsIGdlb1BhdGguY2VudHJvaWQoZClbMV0rNF1cbiAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgY2VudHJvaWQgKyAnKSc7XG4gICAgIH0pO1xufSBcblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdENyZWF0ZSB0aGUgbmVlZGVkIGVsZW1lbnRzXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbi8qIEFwcGVuZCB0aGUgZ3JvdXAgZWxlbWVudCB0byB0aGUgc3ZnICovXG5jb25zdCBtYXAgPSBzdmcuYXBwZW5kKCAnZycpO1xuXG4vKiBJbml0aWF0ZSB0aGUgc3RhdGUgZ3JvdXBzIChhbmQgcGVyZm9ybSBkYXRhIGpvaW4pICAqL1xuY29uc3Qgc3RhdGVHcm91cCA9IHN2Zy5zZWxlY3RBbGwoJ2cnKVxuXHQuZGF0YShqc29uRGF0YS5mZWF0dXJlcylcblxuXG4vKiBEZWZpbmUgdGhlIFwiRW50ZXJcIiBzZWxlY3Rpb24gZm9yIGVhY2ggc3RhdGUgZ3JvdXAuICovXG5jb25zdCBzdGF0ZUVudGVyID0gc3RhdGVHcm91cFxuICAuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuXHQvLyBUb2dnbGUgd2hldGhlciBpdCBpcyBzZWxlY3RlZCBcblx0Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGQpIHtcbiAgICBsZXQgY2xhc3NMaXN0ID0gdGhpcy5jbGFzc0xpc3Q7XG4gIFx0bGV0IGlzU2VsZWN0ZWQgPSBjbGFzc0xpc3QuY29udGFpbnMoXCJzZWxlY3RlZFwiKTtcbiAgICBpc1NlbGVjdGVkPyBjbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIikgOiBjbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XG4gIH0pXG4gIC5hdHRyKCdjbGFzcycsICdzdGF0ZS1jb250YWluZXInKTtcblxuXG4vKiBBcHBlbmQgdGl0bGUgKGkuZSB0aGUgc3RhdGUgbmFtZSkgdG8gZWFjaCBzdGF0ZSBncm91cCAqL1xuc3RhdGVFbnRlci5hcHBlbmQoJ3RpdGxlJylcbiAgICAuYXR0cignY2xhc3MnLCAnbmFtZS10ZXh0JylcbiAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wcm9wZXJ0aWVzLm5hbWU7XG4gICAgfSk7XG5cbi8qIEFwcGVuZCB0aGUgcGF0aCBjb3JyZXNwb25kaW5nIHRvIGVhY2ggc3RhdGUgKi9cbmNvbnN0IHN0YXRlU2VsZWN0aW9uID0gc3RhdGVFbnRlci5hcHBlbmQoICdwYXRoJyApXG4gICAgLmF0dHIoJ2NsYXNzJywgJ3VzLXN0YXRlJylcbiAgICAuYXR0ciggJ2QnLCBnZW9QYXRoICk7XG5cbi8qIEFwcGVuZCB0aGUgdGV4dCAodG8gZGlzcGxheSBkYXRhKSBjb3JyZXNwb25kaW5nIHRvIGVhY2ggc3RhdGUgKi9cbmNvbnN0IHRleHRTZWxlY3Rpb24gPSBzdGF0ZUVudGVyLmFwcGVuZCggJ3RleHQnKVxuXHQubWVyZ2Uoc3RhdGVHcm91cC5zZWxlY3QoJ3RleHQnKSlcbiAgICAuYXR0cignY2xhc3MnLCAnY2FzZXMtdGV4dCcpO1xuXG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRFbnN1cmUgZGF0YSBsb2FkIHByaW9yIHRvIHZpc3VhbGl6aW5nIGl0XG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiQud2hlbihcbiAgICBsb2FkRGF0YShjc3ZQYXRoKVxuKS5kb25lKGZ1bmN0aW9uIChyZXMpIHtcbiAgXHRhcHBseVN0YXRlRGF0YShzdGF0ZVNlbGVjdGlvbiwgdGV4dFNlbGVjdGlvbik7XG4gIFx0Y3JlYXRlTGVnZW5kKCk7XG59KS5mYWlsKGZ1bmN0aW9uIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xufSk7XG5cblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdENyZWF0ZSB0aGUgbGVnZW5kXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbmNvbnN0IGxlZ2VuZFByb3BzID0ge1xuICB3aWR0aDogJzFlbScsXG4gIGhlaWdodDogJzIwZW0nLFxuICB5QXhpc0xhYmVsOiAnTnVtYmVyIG9mIENhc2VzJ1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMZWdlbmQoKSB7XG4gIFxuICAvLyBBcHBlbmQgYSBkZWZzIChmb3IgZGVmaW5pdGlvbikgZWxlbWVudCB0byB0aGUgU1ZHXG4gIGNvbnN0IGRlZnMgPSBzdmcuYXBwZW5kKCdkZWZzJyk7XG5cbiAgLy8gQXBwZW5kIGxpbmVhckdyYWRpZW50IGVsZW1lbnQgdG8gdGhlIGRlZnNcbiAgY29uc3QgbGluZWFyR3JhZGllbnQgPSBkZWZzLmFwcGVuZCgnbGluZWFyR3JhZGllbnQnKVxuICAgIC5hdHRyKCdpZCcsICdsaW5lYXJHcmFkaWVudCcpXG4gICAgLy8gRGVmaW5lIHZlcnRpY2FsIGdyYWRpZW50XG4gICAgLmF0dHIoJ3gxJywgJzAlJykuYXR0cigneTEnLCAnMCUnKVxuICAgIC5hdHRyKCd4MicsICcwJScpLmF0dHIoJ3kyJywgJzEwMCUnKTtcbiAgXG4gIC8vIEFwcGVuZCBtdWx0aXBsZSBjb2xvciBzdG9wcyBieSB1c2luZyBEMydzIGRhdGEvZW50ZXIgc3RlcFxuXHRsaW5lYXJHcmFkaWVudC5zZWxlY3RBbGwoJ3N0b3AnKVxuICAgIC5kYXRhKCBjb2xvclNjYWxlLnJhbmdlKCkgKVxuICAgIC5lbnRlcigpLmFwcGVuZCgnc3RvcCcpXG4gICAgLmF0dHIoJ29mZnNldCcsIGZ1bmN0aW9uKGQsaSkgeyBcblx0XHRcdCByZXR1cm4gaS8oY29sb3JTY2FsZS5yYW5nZSgpLmxlbmd0aC0xKTtcblx0XHR9KVxuICAgIC5hdHRyKCdzdG9wLWNvbG9yJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZDsgfSk7XG5cbiAgLy8gR2VuZXJhZ2UgdGhlIGxlZ2VuZCwgYW5kIGZpbGwgaXQgd2l0aCB0aGUgZ3JhZGllbnRcbiAgY29uc3QgbGVnZW5kID0gc3ZnLmFwcGVuZCgncmVjdCcpXG4gICAgLmF0dHIoJ2lkJywgJ2xlZ2VuZCcpXG4gICAgLmF0dHIoJ3dpZHRoJywgbGVnZW5kUHJvcHMud2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCBsZWdlbmRQcm9wcy5oZWlnaHQpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICd1cmwoI2xpbmVhckdyYWRpZW50KScpO1xuICBcbiAgLy8gU2V0IHRoZSByYW5nZSBmb3IgdGhlIHktYXhpcyBhbmQgYXBwZW5kIGl0XG5cdGNvbnN0IHkgPSBkMy5zY2FsZUxpbmVhcigpLnJhbmdlKFtsZWdlbmRQcm9wcy5oZWlnaHQsIDBdKTtcbiAgeS5kb21haW4oY29sb3JTY2FsZS5kb21haW4oKSk7XG5cbiAgLy8gVGV4dCBsYWJlbCBmb3IgdGhlIHktYXhpc1xuICBzdmcuYXBwZW5kKCd0ZXh0JylcbiAgXHRcdC5hdHRyKCdjbGFzcycsICdsZWdlbmQtY2FzZXMtbGFiZWwnKVxuICBcdFx0LmF0dHIoJ3RyYW5zZm9ybScsICdyb3RhdGUoLTkwKScpXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gICAgXHQuYXR0cignZHgnLCAnLTllbScpXG4gIFx0XHQuYXR0cignZHknLCAnMWVtJylcbiAgICAgIC50ZXh0KGxlZ2VuZFByb3BzLnlBeGlzTGFiZWwpOyAgICAgIFxuICBcbiAgLy8gQ3JlYXRlIHRoZSB5U2NhbGVcbiAgY29uc3QgeVNjYWxlID0gZDMuc2NhbGVCYW5kKClcbiAgXHQuZG9tYWluKGNvbG9yU2NhbGUuZG9tYWluKCkpIC8vIFNldCByYW5nZSBvZiBjYXNlc1xuICBcdC5yYW5nZShbMCwgbGVnZW5kUHJvcHMuaGVpZ2h0XSkgLy8gQXJyYW5nZXMgZnJvbSB0b3AgdG8gYm90dG9tXG4gIFx0LnBhZGRpbmcoMSk7XG4gICAgXG4gIC8vIFNldCB5LWF4aXMgYW5kIGFwcGx5IHRpY2sgZm9ybWF0IGFuZCBzaXplXG4gIGNvbnN0IHlBeGlzID0gZDMuYXhpc0xlZnQoeVNjYWxlKVxuICBcdC50aWNrU2l6ZSgtbGVnZW5kUHJvcHMud2lkdGgvMik7XG4gIFxuICAvLyBBcHBlbmQgdGhlIHktYXhpcyBcbiAgY29uc3QgeVRpY2tzID0gc3ZnLmFwcGVuZCgnZycpLmNhbGwoZDMuYXhpc0xlZnQoeSkpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1jYXNlcy10aWNrcycpXG4gIFx0LmF0dHIoJ2ZpbGwnLCAnYmxhY2snKVxuICBcdC5jYWxsKHlBeGlzKSBcbiAgICAgIC5zZWxlY3RBbGwoJy5kb21haW4nKSAgLy8gU2VsZWN0IHRoZSBkb21haW4gYW5kIHJlbW92ZSBpdFxuICAgICAgICAucmVtb3ZlKCk7XG4gIFxuIFxuXG4gIFxuXG4gIFxufVxuXG4iXSwibmFtZXMiOlsic2VsZWN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0VBY0EsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDO0VBQ2hDLE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDOzs7Ozs7O0VBT3RDLE1BQU0sR0FBRyxHQUFHQSxXQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRTFCLE1BQU0sUUFBUSxHQUFHO0lBQ2YsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDekIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDNUI7Ozs7Ozs7RUFPRCxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxZQUFZLEVBQUU7SUFDeEMsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNYLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztFQUluRCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFOztPQUVyQixVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQzs7Ozs7OztFQU9wQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztFQUU5RyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFO09BQzlCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztPQUNuQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7Ozs7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
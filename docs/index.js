import 
{ select, 
  geoAlbersUsa,
  scaleLinear,
 	scaleBand,
  extent,
  axisLeft,
	csv
} from 'd3';

/*-------------------------------------------
	Define the data sources 
--------------------------------------------*/

const jsonData = us_states_json;
const csvPath = 'states_infected.csv';
 
/*-------------------------------------------
	Select the SVG (serves as the 'canvas')
--------------------------------------------*/

// Select the svg
const svg = select('svg');

const svgProps = {
 	width: +svg.attr('width'),
  height: +svg.attr('height')
}

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
const legendTextRange = ['1-10', '11-100', '101-1,000', '1,001-3,000', '3,000+'];
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
};


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
       let centroid = [geoPath.centroid(d)[0]-16, geoPath.centroid(d)[1]+4]
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
	.data(jsonData.features)


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
}

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


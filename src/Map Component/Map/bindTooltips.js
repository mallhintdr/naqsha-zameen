export const bindMurabbaTooltip = (feature, layer, map) => {
  
    const tooltipContent = feature.properties.Murabba_No;
    const updateTooltipVisibility = () => {
      const zoomLevel = map.getZoom();
      if (zoomLevel >= 14) {
        layer.bindTooltip(tooltipContent, { permanent: true, direction: "top", className: "murabba-tooltip" }).openTooltip();
      } else if (layer.getTooltip()) {
        layer.unbindTooltip();
      }
    };
    map.on("zoomend", updateTooltipVisibility);
    updateTooltipVisibility();
  };
  
  export const bindKillaTooltip = (feature, layer, map) => {
    const tooltipContent = feature.properties.Killa;
    const updateTooltipVisibility = () => {
      const zoomLevel = map.getZoom();
      if (zoomLevel >= 14) {
        layer.bindTooltip(tooltipContent, { permanent: true, direction: "center", className: "killa-tooltip" }).openTooltip();
      } else if (layer.getTooltip()) {
        layer.unbindTooltip();
      }
    };
    map.on("zoomend", updateTooltipVisibility);
    updateTooltipVisibility();
  };
  
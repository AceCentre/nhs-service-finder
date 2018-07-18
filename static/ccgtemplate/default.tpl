<h2 class="servicename"><%- data.servicename %></h2>
<ul class="infolist">
<% if (data.caseload) { %>
  <li>Caseload: <%- data.caseload %></li>
<% } %>
<% if (data.contactphone) { %>
  <li><i class="fa fa-phone"></i>  <%- data.contactphone %></li>
<% } %>
<% if (data.email) { %>
  <li><i class="fa fa-envelope"></i> <a href="mailto:<%- data.email %>"><%- data.email %></li>
<% } %>
<% if (data.website) { %>
  <li><a href="<%- data.website %>"><i class="fa fa-link"></i> <%- data.website %></a></li>
<% } %>
<% if (data.cm_listing_link) { %>
  <li><a href="<%- data.cm_listing_link %>"><i class="fa fa-link"></i> <%- data.cm_listing_link %></a></li>
<% } %>
<% if (data.address) { %>
  <li><span>Address: </span> <%- data.address %></li>
<% } %>
</ul>


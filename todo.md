JSON to Dart Converter - MVP Implementation
Files to Create:
index.html - Main HTML structure with 3-column layout (History, Input/Options, Output)
style.css - Dark theme styling matching the design
script.js - Core functionality for JSON to Dart conversion
dart-generator.js - Dart class generation logic
Core Features:
Layout: 3-column responsive layout (History sidebar, Input section, Output section)
JSON Input: Code editor area for JSON input
Class Name Input: Text field for Dart class name
Options Checkboxes:
Generate toJson method
Generate copyWith method
Generate toString method
Generate JSON keys
Always use num type for number
Use JSONSerializable
Use Equatable
Use default value
Generate json as comment
Convert Button: Process JSON and generate Dart class
Output Display: Code editor showing generated Dart class
Copy Code Button: Copy generated code to clipboard
History Sidebar: Store and display previous conversions
Local Storage: Persist settings and history
Technical Implementation:
Use Monaco Editor or simple textarea for code editing
JSON parsing and validation
Dart class template generation
Local storage for persistence
Responsive design with CSS Grid/Flexbox
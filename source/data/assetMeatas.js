const metaDataScheme= {
    "BasicInformation": {
      "FileName": "string",
      "FilePath": "string",
      "FileSize": "integer",
      "CreationTime": "date-time",
      "ModificationTime": "date-time",
      "AccessTime": "date-time"
    },
    "TechnicalMetadata": {
      "Format": "string",
      "Resolution": {
        "Width": "integer",
        "Height": "integer"
      },
      "Bitrate": "integer",
      "FrameRate": "number",
      "AudioChannels": "integer",
      "SampleRate": "integer"
    },
    "ContentDescription": {
      "Title": "string",
      "Description": "string",
      "Tags": ["string"],
      "Category": "string"
    },
    "CopyrightAndUsageRights": {
      "Author": "string",
      "Copyright": "string",
      "UsageRights": "string"
    },
    "SourceAndTracking": {
      "Source": "string",
      "OriginalURL": "string",
      "CaptureTime": "date-time",
      "DeviceInformation": {
        "Model": "string",
        "Manufacturer": "string"
      }
    },
    "RelationalMetadata": {
      "ProjectAssociation": ["string"],
      "VersionHistory": [
        {
          "Version": "string",
          "Date": "date-time",
          "Description": "string"
        }
      ],
      "ReferenceCount": "integer"
    },
    "GeospatialMetadata": {
      "GeoLocation": {
        "Latitude": "number",
        "Longitude": "number"
      }
    },
    "MetadataMetadata": {
      "MetadataCreator": "string",
      "MetadataCreationTime": "date-time",
      "MetadataModificationTime": "date-time"
    }
  }
  
class ESMTrackData {
    constructor(data) {
        this.Data_TimeStamp = data.Data_TimeStamp;
        this.Location_Latitude = data.Location_Latitude;
        this.Location_Longitude = data.Location_Longitude;
        this.Data_IndicatorText = data.Data_IndicatorText;
        this.Analysis_Center = data.Analysis_Center;
        this.GeoLocation_RadiatedPower = data.GeoLocation_RadiatedPower;
        this.GeoLocation_Snr = data.GeoLocation_Snr;
        this.Uncertainty_Center_Latitude = data.Uncertainty_Center_Latitude;
        this.Uncertainty_Center_Longitude = data.Uncertainty_Center_Longitude;
        this.Uncertainty_Major_Axis = data.Uncertainty_Major_Axis;
        this.Uncertainty_Minor_Axis = data.Uncertainty_Minor_Axis;
        this.Uncertainty_Rotation = data.Uncertainty_Rotation;
        this.Uncertainty_Confidence = data.Uncertainty_Confidence;
        this.Analysis_Processor = data.Analysis_Processor;
        this.Analysis_ProcessType = data.Analysis_ProcessType;
        this.Analysis_Result_Flags = data.Analysis_Result_Flags;
        this.Signal_Detector_Id = data.Signal_Detector_Id;
        this.Signal_Detector_Name = data.Signal_Detector_Name;
        this.Data_Decision_Confidence = data.Data_Decision_Confidence;
        this.Data_Decision_Level = data.Data_Decision_Level;
        this.Signal_Duration = data.Signal_Duration;
        this.Signal_Bandwidth = data.Signal_Bandwidth;
        this.Signal_SNR = data.Signal_SNR;
        this.Signal_Power = data.Signal_Power;
        this.Signal_Pulse_SNR = data.Signal_Pulse_SNR;
        this.Signal_Decoded_Data = data.Signal_Decoded_Data;
        this.Signal_Detect_Timestamp = data.Signal_Detect_Timestamp;
        this.Signal_Origin = data.Signal_Origin;
        this.Signal_OriginName = data.Signal_OriginName;
        this.Data_Input_Port = data.Data_Input_Port;
        this.Analysis_NodeGroup = data.Analysis_NodeGroup;
        this.Analysis_Aperture = data.Analysis_Aperture;
        this.Analysis_ResultID = data.Analysis_ResultID;
    }
}

module.exports = ESMTrackData;